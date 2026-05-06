uniform vec2 uResolution;
uniform float uSize;
uniform sampler2D uParticlesTexture;
uniform float uMorphProgress;
uniform float uInfoProgress;

attribute vec2 aParticlesUv;
attribute vec3 aColor;
attribute vec3 aTargetColor;
attribute float aSize;

varying vec3 vColor;
varying float vFogDepth;

void main() {
  vec4 particle = texture(uParticlesTexture, aParticlesUv);

  // Final position
  vec4 modelPosition = modelMatrix * vec4(particle.xyz, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  float infoProgress = uInfoProgress * uInfoProgress * (3.0 - 2.0 * uInfoProgress);
  vec2 viewportDirection = normalize(viewPosition.xy + vec2(0.001));
  viewPosition.xy += viewportDirection * infoProgress * infoProgress * max(-viewPosition.z, 1.0) * 9.0;
  vec4 projectedPosition = projectionMatrix * viewPosition;
  gl_Position = projectedPosition;

  // Point size
  float sizeIn = smoothstep(0.0, 0.6, particle.a);
  float sizeOut = 1.0 - smoothstep(0.6, 1.0, particle.a);
  float size = min(sizeIn, sizeOut);
  float morphPulse = sin(uMorphProgress * 3.141592653589793);

  gl_PointSize = size * (1.0 + morphPulse * 0.45) * aSize * uSize * uResolution.y;
  gl_PointSize *= 1.0 - smoothstep(0.25, 1.0, uInfoProgress);
  gl_PointSize *= (1.0 / - viewPosition.z);

  // Varyings
  float colorProgress = uMorphProgress * uMorphProgress * (3.0 - 2.0 * uMorphProgress);
  vColor = mix(aColor, aTargetColor, colorProgress);
  vFogDepth = -viewPosition.z;
}
