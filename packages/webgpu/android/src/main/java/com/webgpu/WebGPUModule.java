package com.webgpu;

import android.util.Log;

import androidx.annotation.OptIn;

import java.util.HashSet;
import java.util.Set;

import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.JavaScriptContextHolder;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.common.annotations.FrameworkAPI;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.modules.blob.BlobModule;
import com.facebook.react.modules.blob.BlobProvider;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.facebook.react.turbomodule.core.interfaces.CallInvokerHolder;

@ReactModule(name = WebGPUModule.NAME)
public class WebGPUModule extends NativeWebGPUModuleSpec {
  static {
      System.loadLibrary("react-native-wgpu"); // Load the C++ library
  }

  private final Object mContextLock = new Object();
  private final Set<Integer> mSurfaceContextsIds = new HashSet<>();

  public WebGPUModule(ReactApplicationContext reactContext) {
    super(reactContext);
    // Initialize the C++ module
    initialize();
  }

  @OptIn(markerClass = FrameworkAPI.class)
  @ReactMethod(isBlockingSynchronousMethod = true)
  public boolean install() {
    ReactApplicationContext context = getReactApplicationContext();
    JavaScriptContextHolder jsContext = context.getJavaScriptContextHolder();
    CallInvokerHolder callInvokerHolder = context.getCatalystInstance().getJSCallInvokerHolder();
    BlobModule blobModule = getReactApplicationContext().getNativeModule(BlobModule.class);
    if (blobModule == null) {
      throw new RuntimeException("React Native's BlobModule was not found!");
    }
    initializeNative(jsContext.get(), (CallInvokerHolderImpl) callInvokerHolder, blobModule);
    return true;
  }

  @OptIn(markerClass = FrameworkAPI.class)
  @DoNotStrip
  private native void initializeNative(long jsRuntime, CallInvokerHolderImpl jsInvoker, BlobModule blobModule);

  @ReactMethod(isBlockingSynchronousMethod = true)
  public boolean createSurfaceContext(double contextId) {
    waitForNativeSurface((int)contextId);

    ReactApplicationContext context = getReactApplicationContext();
    JavaScriptContextHolder jsContext = context.getJavaScriptContextHolder();
    createSurfaceContext(jsContext.get(), (int)contextId);
    return true;
  }

  @DoNotStrip
  private native void createSurfaceContext(long jsRuntime, int contextId);

  private void waitForNativeSurface(Integer contextId) {
    synchronized (mContextLock) {
      while (!mSurfaceContextsIds.contains(contextId)) {
        try {
          mContextLock.wait();
        } catch (InterruptedException e) {
          Log.e("RNWebGPU", "Unable to create a context");
          return;
        }
      }
    }
  }

  protected void onSurfaceCreated(Integer contextId) {
    synchronized (mContextLock) {
      mSurfaceContextsIds.add(contextId);
      mContextLock.notifyAll();
    }
  }

}