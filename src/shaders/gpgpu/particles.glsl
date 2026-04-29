uniform float uTime;
uniform float uDeltaTime;
uniform sampler2D uBase;
uniform sampler2D uTarget;
uniform float uMorphProgress;
uniform float uFlowFieldInfluence;
uniform float uFlowFieldStrength;
uniform float uFlowFieldFrequency;
uniform float uTimeScale;
uniform float uDecayRate;
uniform float uReturnForce;

#include ../includes/simplexNoise4d.glsl

void main() {
  float time = uTime * uTimeScale;
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 particle = texture(uParticles, uv);
  vec4 base = texture(uBase, uv);
  vec4 target = texture(uTarget, uv);
  float morphProgress = uMorphProgress * uMorphProgress * (3.0 - 2.0 * uMorphProgress);
  vec3 morphBase = mix(base.xyz, target.xyz, morphProgress);

  // Dead
  if (particle.a >= 1.0) {
    particle.a = mod(particle.a, 1.0);
    particle.xyz = morphBase;
  }

  // Alive
  else {
    // Strength
    float strength = simplexNoise4d(vec4(morphBase * 0.7, time + 1.0));
    float influence = (uFlowFieldInfluence - 0.5) * (- 2.0);
    strength = smoothstep(influence, 1.0, strength);

    // Flow field
    vec3 flowField = vec3(
      simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 0.0, time)),
      simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 1.0, time)),
      simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 2.0, time))
    );
    flowField = normalize(flowField);
    particle.xyz += flowField * uDeltaTime * strength * uFlowFieldStrength;
    particle.xyz += (morphBase - particle.xyz) * uDeltaTime * uReturnForce * smoothstep(0.0, 0.08, uMorphProgress);

    // Decay
    particle.a += uDeltaTime * uDecayRate;
  }

  gl_FragColor = particle;
}
