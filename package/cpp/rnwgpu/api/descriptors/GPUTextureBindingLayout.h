#pragma once

#include <memory>
#include <string>

#include "webgpu/webgpu_cpp.h"

#include "Logger.h"
#include "RNFJSIConverter.h"
#include <RNFHybridObject.h>

namespace jsi = facebook::jsi;
namespace m = margelo;

namespace rnwgpu {

class GPUTextureBindingLayout {
public:
  wgpu::TextureBindingLayout *getInstance() { return &_instance; }

  wgpu::TextureBindingLayout _instance;
};
} // namespace rnwgpu

namespace margelo {

template <>
struct JSIConverter<std::shared_ptr<rnwgpu::GPUTextureBindingLayout>> {
  static std::shared_ptr<rnwgpu::GPUTextureBindingLayout>
  fromJSI(jsi::Runtime &runtime, const jsi::Value &arg, bool outOfBounds) {
    auto result = std::make_unique<rnwgpu::GPUTextureBindingLayout>();
    if (!outOfBounds && arg.isObject()) {
      auto value = arg.getObject(runtime);
      if (value.hasProperty(runtime, "sampleType")) {
        auto sampleType = value.getProperty(runtime, "sampleType");

        if (sampleType.isString()) {
          auto str = sampleType.asString(runtime).utf8(runtime);
          wgpu::TextureSampleType enumValue;
          m::EnumMapper::convertJSUnionToEnum(str, &enumValue);
          result->_instance.sampleType = enumValue;
        }
      }
      if (value.hasProperty(runtime, "viewDimension")) {
        auto viewDimension = value.getProperty(runtime, "viewDimension");

        if (viewDimension.isString()) {
          auto str = viewDimension.asString(runtime).utf8(runtime);
          wgpu::TextureViewDimension enumValue;
          m::EnumMapper::convertJSUnionToEnum(str, &enumValue);
          result->_instance.viewDimension = enumValue;
        }
      }
      if (value.hasProperty(runtime, "multisampled")) {
        auto multisampled = value.getProperty(runtime, "multisampled");
        if (multisampled.isBool()) {
          result->_instance.multisampled = multisampled.getBool();
        }
      }
    }

    return result;
  }
  static jsi::Value
  toJSI(jsi::Runtime &runtime,
        std::shared_ptr<rnwgpu::GPUTextureBindingLayout> arg) {
    // No conversions here
    return jsi::Value::null();
  }
};
} // namespace margelo