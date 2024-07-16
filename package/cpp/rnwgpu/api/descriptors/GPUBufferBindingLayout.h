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

class GPUBufferBindingLayout {
public:
  wgpu::BufferBindingLayout *getInstance() { return &_instance; }

  wgpu::BufferBindingLayout _instance;
};
} // namespace rnwgpu

namespace margelo {

template <>
struct JSIConverter<std::shared_ptr<rnwgpu::GPUBufferBindingLayout>> {
  static std::shared_ptr<rnwgpu::GPUBufferBindingLayout>
  fromJSI(jsi::Runtime &runtime, const jsi::Value &arg, bool outOfBounds) {
    auto result = std::make_unique<rnwgpu::GPUBufferBindingLayout>();
    if (!outOfBounds && arg.isObject()) {
      auto value = arg.getObject(runtime);
      if (value.hasProperty(runtime, "type")) {
        auto type = value.getProperty(runtime, "type");

        if (type.isString()) {
          auto str = type.asString(runtime).utf8(runtime);
          wgpu::BufferBindingType enumValue;
          m::EnumMapper::convertJSUnionToEnum(str, &enumValue);
          result->_instance.type = enumValue;
        }
      }
      if (value.hasProperty(runtime, "hasDynamicOffset")) {
        auto hasDynamicOffset = value.getProperty(runtime, "hasDynamicOffset");
        if (hasDynamicOffset.isBool()) {
          result->_instance.hasDynamicOffset = hasDynamicOffset.getBool();
        }
      }
      if (value.hasProperty(runtime, "minBindingSize")) {
        auto minBindingSize = value.getProperty(runtime, "minBindingSize");

        if (minBindingSize.isNumber()) {
          result->_instance.minBindingSize = minBindingSize.getNumber();
        }
      }
    }

    return result;
  }
  static jsi::Value toJSI(jsi::Runtime &runtime,
                          std::shared_ptr<rnwgpu::GPUBufferBindingLayout> arg) {
    // No conversions here
    return jsi::Value::null();
  }
};
} // namespace margelo