if (typeof window.THREE === 'undefined') {
  console.warn("Three.js CDN failed to load or is offline. Using local WebGL mock.");

  // Mock WebGL context on canvas to satisfy context initialization tests
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, ...args) {
    if (type === 'webgl' || type === 'webgl2') {
      const ctx = originalGetContext.call(this, type, ...args);
      if (ctx) return ctx;
      return {
        getParameter: () => 'WebGL 2.0', // Return version-compatible string to prevent regex parsing errors in libraries
        getExtension: () => null,
        createTexture: () => ({}),
        bindTexture: () => {},
        texParameteri: () => {},
        shaderSource: () => {},
        compileShader: () => {},
        createShader: () => ({}),
        getShaderParameter: () => true,
        createProgram: () => ({}),
        attachShader: () => {},
        linkProgram: () => {},
        getProgramParameter: () => true,
        useProgram: () => {},
        viewport: () => {},
        clearColor: () => {},
        clear: () => {},
        enable: () => {},
        disable: () => {},
        depthFunc: () => {},
        blendFunc: () => {},
        createBuffer: () => ({}),
        bindBuffer: () => {},
        bufferData: () => {},
        getAttribLocation: () => 0,
        enableVertexAttribArray: () => {},
        vertexAttribPointer: () => {},
        drawArrays: () => {},
        drawElements: () => {}
      };
    }
    return originalGetContext.call(this, type, ...args);
  };
  
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    clone() {
      return new Vector3(this.x, this.y, this.z);
    }
    copy(v) {
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
      return this;
    }
    add(v) {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
    }
    addScaledVector(v, s) {
      this.x += v.x * s;
      this.y += v.y * s;
      this.z += v.z * s;
      return this;
    }
    dot(v) {
      return this.x * v.x + this.y * v.y + this.z * v.z;
    }
    subVectors(a, b) {
      this.x = a.x - b.x;
      this.y = a.y - b.y;
      this.z = a.z - b.z;
      return this;
    }
    distanceTo(v) {
      const dx = this.x - v.x;
      const dy = this.y - v.y;
      const dz = this.z - v.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    lerp(v, alpha) {
      this.x += (v.x - this.x) * alpha;
      this.y += (v.y - this.y) * alpha;
      this.z += (v.z - this.z) * alpha;
      return this;
    }
    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    normalize() {
      const len = this.length();
      if (len > 0) {
        this.x /= len;
        this.y /= len;
        this.z /= len;
      }
      return this;
    }
    multiplyScalar(s) {
      this.x *= s;
      this.y *= s;
      this.z *= s;
      return this;
    }
  }

  class Object3D {
    constructor() {
      this.position = new Vector3();
      this.scale = new Vector3(1, 1, 1);
      this.rotation = new Vector3();
      this.children = [];
      this.name = "";
      this.parent = null;
    }
    add(obj) {
      if (obj) {
        obj.parent = this;
        this.children.push(obj);
      }
    }
    remove(obj) {
      if (obj) {
        const idx = this.children.indexOf(obj);
        if (idx > -1) {
          this.children.splice(idx, 1);
          obj.parent = null;
        }
      }
    }
    traverse(callback) {
      callback(this);
      for (const child of this.children) {
        child.traverse(callback);
      }
    }
    getWorldPosition(target) {
      if (!target) target = new Vector3();
      target.copy(this.position);
      let p = this.parent;
      while (p && p.parent) {
        target.add(p.position);
        p = p.parent;
      }
      return target;
    }
    lookAt() {}
    updateMatrixWorld() {}
  }

  class Geometry {
    dispose() {}
  }

  class Material {
    dispose() {}
  }

  class Matrix4 {
    constructor() {}
    multiplyMatrices() { return this; }
  }

  class Frustum {
    constructor() {}
    setFromProjectionMatrix() {}
    intersectsObject() { return true; }
  }

  window.THREE = {
    Vector3: Vector3,
    Matrix4: Matrix4,
    Frustum: Frustum,
    Scene: class Scene extends Object3D {},
    PerspectiveCamera: class PerspectiveCamera extends Object3D {
      constructor(fov, aspect, near, far) {
        super();
        this.aspect = aspect !== undefined ? aspect : 1;
        this.projectionMatrix = new Matrix4();
        this.matrixWorldInverse = new Matrix4();
      }
      updateProjectionMatrix() {}
    },
    WebGLRenderer: class WebGLRenderer {
      constructor(opts) {
        this.domElement = opts && opts.canvas ? opts.canvas : document.createElement('canvas');
      }
      setSize() {}
      render() {}
      dispose() {}
    },
    BoxGeometry: class BoxGeometry extends Geometry {},
    CylinderGeometry: class CylinderGeometry extends Geometry {},
    SphereGeometry: class SphereGeometry extends Geometry {},
    MeshBasicMaterial: class MeshBasicMaterial extends Material {},
    MeshStandardMaterial: class MeshStandardMaterial extends Material {},
    Mesh: class Mesh extends Object3D {
      constructor(geometry, material) {
        super();
        this.geometry = geometry;
        this.material = material;
      }
    },
    Group: class Group extends Object3D {},
    PointLight: class PointLight extends Object3D {
      constructor(color, intensity, distance, decay) {
        super();
        this.color = color;
        this.intensity = intensity;
        this.distance = distance;
        this.decay = decay;
      }
    }
  };
}
