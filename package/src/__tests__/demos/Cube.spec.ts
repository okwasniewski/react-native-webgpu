import { checkImage, client, encodeImage } from "../setup";

const basicVert = /*wgsl*/ `struct Uniforms {
  modelViewProjectionMatrix : mat4x4f,
}
@binding(0) @group(0) var<uniform> uniforms : Uniforms;

struct VertexOutput {
  @builtin(position) Position : vec4f,
  @location(0) fragUV : vec2f,
  @location(1) fragPosition: vec4f,
}

@vertex
fn main(
  @location(0) position : vec4f,
  @location(1) uv : vec2f
) -> VertexOutput {
  var output : VertexOutput;
  output.Position = uniforms.modelViewProjectionMatrix * position;
  output.fragUV = uv;
  output.fragPosition = 0.5 * (position + vec4(1.0, 1.0, 1.0, 1.0));
  return output;
}
`;

const vertexPositionColor = /*wgsl*/ `@fragment
fn main(
  @location(0) fragUV: vec2f,
  @location(1) fragPosition: vec4f
) -> @location(0) vec4f {
  return fragPosition;
}`;

const sampleTextureMixColor = /*wgsl*/ `@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_2d<f32>;

@fragment
fn main(
  @location(0) fragUV: vec2f,
  @location(1) fragPosition: vec4f
) -> @location(0) vec4f {
  return textureSample(myTexture, mySampler, fragUV) * fragPosition;
}
`;

describe("Cube", () => {
  it("Rotating cube", async () => {
    const result = await client.eval(
      ({
        gpu,
        device,
        assets: { cubeVertexArray },
        ctx,
        mat4,
        vec3,
        basicVertWGSL,
        vertexPositionColorWGSL,
      }) => {
        const cubeVertexSize = 4 * 10; // Byte size of one cube vertex.
        const cubePositionOffset = 0;
        const cubeUVOffset = 4 * 8;
        const cubeVertexCount = 36;

        const presentationFormat = gpu.getPreferredCanvasFormat();
        // Create a vertex buffer from the cube data.
        const verticesBuffer = device.createBuffer({
          size: cubeVertexArray.byteLength,
          usage: GPUBufferUsage.VERTEX,
          mappedAtCreation: true,
        });
        new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray);
        verticesBuffer.unmap();

        const pipeline = device.createRenderPipeline({
          label: "cube render pipeline",
          layout: "auto",
          vertex: {
            module: device.createShaderModule({
              code: basicVertWGSL,
            }),
            buffers: [
              {
                arrayStride: cubeVertexSize,
                attributes: [
                  {
                    // position
                    shaderLocation: 0,
                    offset: cubePositionOffset,
                    format: "float32x4",
                  },
                  {
                    // uv
                    shaderLocation: 1,
                    offset: cubeUVOffset,
                    format: "float32x2",
                  },
                ],
              },
            ],
          },
          fragment: {
            module: device.createShaderModule({
              code: vertexPositionColorWGSL,
            }),
            targets: [
              {
                format: presentationFormat,
              },
            ],
          },
          primitive: {
            topology: "triangle-list",

            // Backface culling since the cube is solid piece of geometry.
            // Faces pointing away from the camera will be occluded by faces
            // pointing toward the camera.
            cullMode: "back",
          },

          // Enable depth testing so that the fragment closest to the camera
          // is rendered in front.
          depthStencil: {
            depthWriteEnabled: true,
            depthCompare: "less",
            format: "depth24plus",
          },
        });

        const depthTexture = device.createTexture({
          size: [ctx.width, ctx.height],
          format: "depth24plus",
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });

        const uniformBufferSize = 4 * 16; // 4x4 matrix
        const uniformBuffer = device.createBuffer({
          size: uniformBufferSize,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const uniformBindGroup = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            {
              binding: 0,
              resource: {
                buffer: uniformBuffer,
              },
            },
          ],
        });

        const renderPassDescriptor: GPURenderPassDescriptor = {
          colorAttachments: [
            {
              view: ctx.getCurrentTexture().createView(), // Assigned later
              clearValue: [0.5, 0.5, 0.5, 1.0],
              loadOp: "clear",
              storeOp: "store",
            },
          ],
          depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store",
          },
        };

        const aspect = ctx.width / ctx.height;
        const projectionMatrix = mat4.perspective(
          (2 * Math.PI) / 5,
          aspect,
          1,
          100.0,
        );
        const modelViewProjectionMatrix = mat4.create();

        function getTransformationMatrix() {
          const viewMatrix = mat4.identity();
          mat4.translate(viewMatrix, vec3.fromValues(0, 0, -4), viewMatrix);
          const now = 1721677648;
          mat4.rotate(
            viewMatrix,
            vec3.fromValues(Math.sin(now), Math.cos(now), 0),
            1,
            viewMatrix,
          );

          mat4.multiply(
            projectionMatrix,
            viewMatrix,
            modelViewProjectionMatrix,
          );

          return modelViewProjectionMatrix;
        }

        const transformationMatrix = getTransformationMatrix();
        device.queue.writeBuffer(
          uniformBuffer,
          0,
          transformationMatrix.buffer,
          transformationMatrix.byteOffset,
          transformationMatrix.byteLength,
        );

        const commandEncoder = device.createCommandEncoder();
        const passEncoder =
          commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, uniformBindGroup);
        passEncoder.setVertexBuffer(0, verticesBuffer);
        passEncoder.draw(cubeVertexCount);
        passEncoder.end();
        device.queue.submit([commandEncoder.finish()]);
        return ctx.getImageData();
      },
      {
        basicVertWGSL: basicVert,
        vertexPositionColorWGSL: vertexPositionColor,
      },
    );
    const image = encodeImage(result);
    checkImage(image, "snapshots/cube.png");
  });
  it("Two cubes", async () => {
    const result = await client.eval(
      ({
        gpu,
        device,
        assets: { cubeVertexArray },
        ctx,
        mat4,
        vec3,
        basicVertWGSL,
        vertexPositionColorWGSL,
      }) => {
        const cubeVertexSize = 4 * 10; // Byte size of one cube vertex.
        const cubePositionOffset = 0;
        const cubeUVOffset = 4 * 8;
        const cubeVertexCount = 36;
        const presentationFormat = gpu.getPreferredCanvasFormat();
        // Create a vertex buffer from the cube data.
        const verticesBuffer = device.createBuffer({
          size: cubeVertexArray.byteLength,
          usage: GPUBufferUsage.VERTEX,
          mappedAtCreation: true,
        });
        new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray);
        verticesBuffer.unmap();

        const pipeline = device.createRenderPipeline({
          layout: "auto",
          vertex: {
            module: device.createShaderModule({
              code: basicVertWGSL,
            }),
            buffers: [
              {
                arrayStride: cubeVertexSize,
                attributes: [
                  {
                    // position
                    shaderLocation: 0,
                    offset: cubePositionOffset,
                    format: "float32x4",
                  },
                  {
                    // uv
                    shaderLocation: 1,
                    offset: cubeUVOffset,
                    format: "float32x2",
                  },
                ],
              },
            ],
          },
          fragment: {
            module: device.createShaderModule({
              code: vertexPositionColorWGSL,
            }),
            targets: [
              {
                format: presentationFormat,
              },
            ],
          },
          primitive: {
            topology: "triangle-list",

            // Backface culling since the cube is solid piece of geometry.
            // Faces pointing away from the camera will be occluded by faces
            // pointing toward the camera.
            cullMode: "back",
          },

          // Enable depth testing so that the fragment closest to the camera
          // is rendered in front.
          depthStencil: {
            depthWriteEnabled: true,
            depthCompare: "less",
            format: "depth24plus",
          },
        });

        const depthTexture = device.createTexture({
          size: [ctx.width, ctx.height],
          format: "depth24plus",
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });

        const matrixSize = 4 * 16; // 4x4 matrix
        const offset = 256; // uniformBindGroup offset must be 256-byte aligned
        const uniformBufferSize = offset + matrixSize;

        const uniformBuffer = device.createBuffer({
          size: uniformBufferSize,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const uniformBindGroup1 = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            {
              binding: 0,
              resource: {
                buffer: uniformBuffer,
                offset: 0,
                size: matrixSize,
              },
            },
          ],
        });

        const uniformBindGroup2 = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            {
              binding: 0,
              resource: {
                buffer: uniformBuffer,
                offset: offset,
                size: matrixSize,
              },
            },
          ],
        });

        const renderPassDescriptor: GPURenderPassDescriptor = {
          colorAttachments: [
            {
              view: ctx.getCurrentTexture().createView(),

              clearValue: [0.5, 0.5, 0.5, 1.0],
              loadOp: "clear",
              storeOp: "store",
            },
          ],
          depthStencilAttachment: {
            view: depthTexture.createView(),

            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store",
          },
        };

        const aspect = ctx.width / ctx.height;
        const projectionMatrix = mat4.perspective(
          (2 * Math.PI) / 5,
          aspect,
          1,
          100.0,
        );

        const modelMatrix1 = mat4.translation(vec3.create(-2, 0, 0));
        const modelMatrix2 = mat4.translation(vec3.create(2, 0, 0));
        const modelViewProjectionMatrix1 = mat4.create();
        const modelViewProjectionMatrix2 = mat4.create();
        const viewMatrix = mat4.translation(vec3.fromValues(0, 0, -7));

        const tmpMat41 = mat4.create();
        const tmpMat42 = mat4.create();

        function updateTransformationMatrix() {
          const now = 1721677648;

          mat4.rotate(
            modelMatrix1,
            vec3.fromValues(Math.sin(now), Math.cos(now), 0),
            1,
            tmpMat41,
          );
          mat4.rotate(
            modelMatrix2,
            vec3.fromValues(Math.cos(now), Math.sin(now), 0),
            1,
            tmpMat42,
          );

          mat4.multiply(viewMatrix, tmpMat41, modelViewProjectionMatrix1);
          mat4.multiply(
            projectionMatrix,
            modelViewProjectionMatrix1,
            modelViewProjectionMatrix1,
          );
          mat4.multiply(viewMatrix, tmpMat42, modelViewProjectionMatrix2);
          mat4.multiply(
            projectionMatrix,
            modelViewProjectionMatrix2,
            modelViewProjectionMatrix2,
          );
        }

        updateTransformationMatrix();
        device.queue.writeBuffer(
          uniformBuffer,
          0,
          modelViewProjectionMatrix1.buffer,
          modelViewProjectionMatrix1.byteOffset,
          modelViewProjectionMatrix1.byteLength,
        );
        device.queue.writeBuffer(
          uniformBuffer,
          offset,
          modelViewProjectionMatrix2.buffer,
          modelViewProjectionMatrix2.byteOffset,
          modelViewProjectionMatrix2.byteLength,
        );

        const commandEncoder = device.createCommandEncoder();
        const passEncoder =
          commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(pipeline);
        passEncoder.setVertexBuffer(0, verticesBuffer);

        // Bind the bind group (with the transformation matrix) for
        // each cube, and draw.
        passEncoder.setBindGroup(0, uniformBindGroup1);
        passEncoder.draw(cubeVertexCount);

        passEncoder.setBindGroup(0, uniformBindGroup2);
        passEncoder.draw(cubeVertexCount);

        passEncoder.end();
        device.queue.submit([commandEncoder.finish()]);

        return ctx.getImageData();
      },
      {
        basicVertWGSL: basicVert,
        vertexPositionColorWGSL: vertexPositionColor,
      },
    );
    const image = encodeImage(result);
    checkImage(image, "snapshots/two-cube.png");
  });
  it("Textured cube", async () => {
    const result = await client.eval(
      ({
        gpu,
        device,
        assets: { cubeVertexArray, di3D: imageBitmap },
        ctx,
        mat4,
        vec3,
        basicVertWGSL,
        sampleTextureMixColorWGSL,
      }) => {
        const cubeVertexSize = 4 * 10; // Byte size of one cube vertex.
        const cubePositionOffset = 0;
        const cubeUVOffset = 4 * 8;
        const cubeVertexCount = 36;
        const presentationFormat = gpu.getPreferredCanvasFormat();

        // Create a vertex buffer from the cube data.
        const verticesBuffer = device.createBuffer({
          size: cubeVertexArray.byteLength,
          usage: GPUBufferUsage.VERTEX,
          mappedAtCreation: true,
        });
        new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray);
        verticesBuffer.unmap();

        const pipeline = device.createRenderPipeline({
          layout: "auto",
          vertex: {
            module: device.createShaderModule({
              code: basicVertWGSL,
            }),
            buffers: [
              {
                arrayStride: cubeVertexSize,
                attributes: [
                  {
                    // position
                    shaderLocation: 0,
                    offset: cubePositionOffset,
                    format: "float32x4",
                  },
                  {
                    // uv
                    shaderLocation: 1,
                    offset: cubeUVOffset,
                    format: "float32x2",
                  },
                ],
              },
            ],
          },
          fragment: {
            module: device.createShaderModule({
              code: sampleTextureMixColorWGSL,
            }),
            targets: [
              {
                format: presentationFormat,
              },
            ],
          },
          primitive: {
            topology: "triangle-list",

            // Backface culling since the cube is solid piece of geometry.
            // Faces pointing away from the camera will be occluded by faces
            // pointing toward the camera.
            cullMode: "back",
          },

          // Enable depth testing so that the fragment closest to the camera
          // is rendered in front.
          depthStencil: {
            depthWriteEnabled: true,
            depthCompare: "less",
            format: "depth24plus",
          },
        });

        const depthTexture = device.createTexture({
          size: [ctx.width, ctx.height],
          format: "depth24plus",
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });

        const uniformBufferSize = 4 * 16; // 4x4 matrix
        const uniformBuffer = device.createBuffer({
          size: uniformBufferSize,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const cubeTexture = device.createTexture({
          size: [imageBitmap.width, imageBitmap.height, 1],
          format: "rgba8unorm",
          usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
        });

        device.queue.writeTexture(
          { texture: cubeTexture, mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
          imageBitmap.data.buffer,
          {
            offset: 0,
            bytesPerRow: 4 * imageBitmap.width,
            rowsPerImage: imageBitmap.height,
          },
          { width: imageBitmap.width, height: imageBitmap.height },
        );

        // device.queue.copyExternalImageToTexture(
        //   { source: imageBitmap },
        //   { texture: cubeTexture },
        //   [imageBitmap.width, imageBitmap.height],
        // );

        // Create a sampler with linear filtering for smooth interpolation.
        const sampler = device.createSampler({
          magFilter: "linear",
          minFilter: "linear",
        });

        const uniformBindGroup = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            {
              binding: 0,
              resource: {
                buffer: uniformBuffer,
              },
            },
            {
              binding: 1,
              resource: sampler,
            },
            {
              binding: 2,
              resource: cubeTexture.createView(),
            },
          ],
        });

        const renderPassDescriptor: GPURenderPassDescriptor = {
          colorAttachments: [
            {
              view: ctx.getCurrentTexture().createView(), // Assigned later

              clearValue: [0.5, 0.5, 0.5, 1.0],
              loadOp: "clear",
              storeOp: "store",
            },
          ],
          depthStencilAttachment: {
            view: depthTexture.createView(),

            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store",
          },
        };

        const aspect = ctx.width / ctx.height;
        const projectionMatrix = mat4.perspective(
          (2 * Math.PI) / 5,
          aspect,
          1,
          100.0,
        );
        const modelViewProjectionMatrix = mat4.create();

        function getTransformationMatrix() {
          const viewMatrix = mat4.identity();
          mat4.translate(viewMatrix, vec3.fromValues(0, 0, -4), viewMatrix);
          const now = 1721677648;
          mat4.rotate(
            viewMatrix,
            vec3.fromValues(Math.sin(now), Math.cos(now), 0),
            1,
            viewMatrix,
          );

          mat4.multiply(
            projectionMatrix,
            viewMatrix,
            modelViewProjectionMatrix,
          );

          return modelViewProjectionMatrix;
        }

        const transformationMatrix = getTransformationMatrix();
        device.queue.writeBuffer(
          uniformBuffer,
          0,
          transformationMatrix.buffer,
          transformationMatrix.byteOffset,
          transformationMatrix.byteLength,
        );

        const commandEncoder = device.createCommandEncoder();
        const passEncoder =
          commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, uniformBindGroup);
        passEncoder.setVertexBuffer(0, verticesBuffer);
        passEncoder.draw(cubeVertexCount);
        passEncoder.end();
        device.queue.submit([commandEncoder.finish()]);

        return ctx.getImageData();
      },
      {
        basicVertWGSL: basicVert,
        vertexPositionColorWGSL: vertexPositionColor,
        sampleTextureMixColorWGSL: sampleTextureMixColor,
      },
    );
    const image = encodeImage(result);
    checkImage(image, "snapshots/textured-cube.png");
  });
});
