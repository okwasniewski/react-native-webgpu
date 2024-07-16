#pragma once

#include <memory>
#include <string>

#include "webgpu/webgpu_cpp.h"

#include "Logger.h"
#include "RNFJSIConverter.h"
#include <RNFHybridObject.h>

#include "GPUExtent3D.h"

namespace jsi = facebook::jsi;
namespace m = margelo;

namespace rnwgpu {

class GPUTextureDescriptor {
public:
  wgpu::TextureDescriptor *getInstance() { return &_instance; }

  wgpu::TextureDescriptor _instance;

  std::string label;
};
} // namespace rnwgpu

namespace margelo {

template <> struct JSIConverter<std::shared_ptr<rnwgpu::GPUTextureDescriptor>> {
  static std::shared_ptr<rnwgpu::GPUTextureDescriptor>
  fromJSI(jsi::Runtime &runtime, const jsi::Value &arg, bool outOfBounds) {
    auto result = std::make_unique<rnwgpu::GPUTextureDescriptor>();
    if (!outOfBounds && arg.isObject()) {
      auto value = arg.getObject(runtime);
      if (value.hasProperty(runtime, "size")) {
        auto size = value.getProperty(runtime, "size");

        if (size.isObject()) {
          auto val =
              m::JSIConverter<std::shared_ptr<rnwgpu::GPUExtent3D>>::fromJSI(
                  runtime, size, false);
          result->_instance.size = val->_instance;
        }

        if (size.isUndefined()) {
          throw std::runtime_error(
              "Property GPUTextureDescriptor::size is required");
        }
      } else {
        throw std::runtime_error(
            "Property GPUTextureDescriptor::size is not defined");
      }
      if (value.hasProperty(runtime, "mipLevelCount")) {
        auto mipLevelCount = value.getProperty(runtime, "mipLevelCount");

        if (mipLevelCount.isNumber()) {
          result->_instance.mipLevelCount =
              static_cast<uint32_t>(mipLevelCount.getNumber());
        }
      }
      if (value.hasProperty(runtime, "sampleCount")) {
        auto sampleCount = value.getProperty(runtime, "sampleCount");

        if (sampleCount.isNumber()) {
          result->_instance.sampleCount =
              static_cast<uint32_t>(sampleCount.getNumber());
        }
      }
      if (value.hasProperty(runtime, "dimension")) {
        auto dimension = value.getProperty(runtime, "dimension");

        if (dimension.isString()) {
          auto str = dimension.asString(runtime).utf8(runtime);
          wgpu::TextureDimension enumValue;
          m::EnumMapper::convertJSUnionToEnum(str, &enumValue);
          result->_instance.dimension = enumValue;
        }
      }
      if (value.hasProperty(runtime, "format")) {
        auto format = value.getProperty(runtime, "format");

        if (format.isString()) {
          auto str = format.asString(runtime).utf8(runtime);
          wgpu::TextureFormat enumValue;
          m::EnumMapper::convertJSUnionToEnum(str, &enumValue);
          result->_instance.format = enumValue;
        }

        if (format.isUndefined()) {
          throw std::runtime_error(
              "Property GPUTextureDescriptor::format is required");
        }
      } else {
        throw std::runtime_error(
            "Property GPUTextureDescriptor::format is not defined");
      }
      if (value.hasProperty(runtime, "usage")) {
        auto usage = value.getProperty(runtime, "usage");

        if (usage.isNumber()) {
          result->_instance.usage =
              static_cast<wgpu::TextureUsage>(usage.getNumber());
        }

        if (usage.isUndefined()) {
          throw std::runtime_error(
              "Property GPUTextureDescriptor::usage is required");
        }
      } else {
        throw std::runtime_error(
            "Property GPUTextureDescriptor::usage is not defined");
      }
      if (value.hasProperty(runtime, "viewFormats")) {
        auto viewFormats = value.getProperty(runtime, "viewFormats");
      }
      if (value.hasProperty(runtime, "label")) {
        auto label = value.getProperty(runtime, "label");

        if (label.isString()) {
          auto str = label.asString(runtime).utf8(runtime);
          result->label = str;
          result->_instance.label = result->label.c_str();
        }
      }
    }

    return result;
  }
  static jsi::Value toJSI(jsi::Runtime &runtime,
                          std::shared_ptr<rnwgpu::GPUTextureDescriptor> arg) {
    // No conversions here
    return jsi::Value::null();
  }
};
} // namespace margelo