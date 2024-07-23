#include "GPUQueue.h"

#include <limits>

#include "Convertors.h"

namespace rnwgpu {

// TODO: remove
struct BufferSource {
  void *data;
  size_t size;            // in bytes
  size_t bytesPerElement; // 1 for ArrayBuffers
};

void GPUQueue::submit(
    std::vector<std::shared_ptr<GPUCommandBuffer>> commandBuffers) {
  std::vector<wgpu::CommandBuffer> bufs(commandBuffers.size());
  for (size_t i = 0; i < commandBuffers.size(); i++) {
    bufs[i] = commandBuffers[i]->get();
  }
  Convertor conv;
  uint32_t bufs_size;
  if (!conv(bufs_size, bufs.size())) {
    return;
  }
  _instance.Submit(bufs_size, bufs.data());
}

void GPUQueue::writeBuffer(std::shared_ptr<GPUBuffer> buffer,
                           uint64_t bufferOffset,
                           std::shared_ptr<ArrayBuffer> data,
                           std::optional<uint64_t> dataOffsetElements,
                           std::optional<size_t> sizeElements) {
  wgpu::Buffer buf = buffer->get();
  BufferSource src{.data = data->_data,
                   .size = data->_size,
                   .bytesPerElement = data->_bytesPerElement};

  // Note that in the JS semantics of WebGPU, writeBuffer works in number of
  // elements of the typed arrays.
  if (dataOffsetElements > uint64_t(src.size / src.bytesPerElement)) {
    throw std::runtime_error("dataOffset is larger than data's size.");
    return;
  }
  uint64_t dataOffset = dataOffsetElements.value_or(0) * src.bytesPerElement;
  src.data = reinterpret_cast<uint8_t *>(src.data) + dataOffset;
  src.size -= dataOffset;

  // Size defaults to dataSize - dataOffset. Instead of computing in elements,
  // we directly use it in bytes, and convert the provided value, if any, in
  // bytes.
  uint64_t size64 = uint64_t(src.size);
  if (sizeElements.has_value()) {
    if (sizeElements.value() >
        std::numeric_limits<uint64_t>::max() / src.bytesPerElement) {
      throw std::runtime_error("size overflows.");
      return;
    }
    size64 = sizeElements.value() * src.bytesPerElement;
  }

  if (size64 > uint64_t(src.size)) {
    throw std::runtime_error("size + dataOffset is larger than data's size.");
    return;
  }

  if (size64 % 4 != 0) {
    throw std::runtime_error("size is not a multiple of 4 bytes.");

    return;
  }

  assert(size64 <= std::numeric_limits<size_t>::max());
  _instance.WriteBuffer(buf, bufferOffset, src.data,
                        static_cast<size_t>(size64));
}

std::future<void> GPUQueue::onSubmittedWorkDone() {
  return _async->runAsync([=] {
    return _instance.OnSubmittedWorkDone(
        wgpu::CallbackMode::WaitAnyOnly,
        [](wgpu::QueueWorkDoneStatus status) {});
  });
}

void GPUQueue::copyExternalImageToTexture(
    std::shared_ptr<GPUImageCopyExternalImage> source,
    std::shared_ptr<GPUImageCopyTextureTagged> destination,
    std::shared_ptr<GPUExtent3D> copySize) {
  throw std::runtime_error("Unimplemented");
}

void GPUQueue::writeTexture(std::shared_ptr<GPUImageCopyTexture> destination,
                            std::shared_ptr<ArrayBuffer> data,
                            std::shared_ptr<GPUImageDataLayout> dataLayout,
                            std::shared_ptr<GPUExtent3D> size) {
  wgpu::ImageCopyTexture dst{};
  wgpu::TextureDataLayout layout{};
  wgpu::Extent3D sz{};
  Convertor conv;
  if (!conv(dst, destination) ||   //
      !conv(layout, dataLayout) || //
      !conv(sz, size)) {
    throw std::runtime_error("Invalid input for GPUQueue::writeTexture()");
  }

  _instance.WriteTexture(&dst, data->_data, data->_size, &layout, &sz);
}

} // namespace rnwgpu
