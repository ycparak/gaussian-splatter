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
uniform float uInfoProgress;

#include ../includes/simplexNoise4d.glsl

void main() {
  float time = uTime * uTimeScale;
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 particle = texture(uParticles, uv);
  vec4 base = texture(uBase, uv);
  vec4 target = texture(uTarget, uv);
  float morphProgress = uMorphProgress * uMorphProgress * (3.0 - 2.0 * uMorphProgress);
  float infoProgress = uInfoProgress * uInfoProgress * (3.0 - 2.0 * uInfoProgress);
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
    particle.xyz += (morphBase - particle.xyz) * uDeltaTime * uReturnForce * smoothstep(0.0, 0.08, uMorphProgress) * (1.0 - infoProgress);

    vec3 dispersalNoise = vec3(
      simplexNoise4d(vec4(base.xyz * 0.42 + vec3(17.0), 1.0)),
      simplexNoise4d(vec4(base.xyz * 0.42 + vec3(31.0), 1.0)),
      simplexNoise4d(vec4(base.xyz * 0.42 + vec3(47.0), 1.0))
    );
    vec3 outwardDirection = normalize(vec3(morphBase.xy * vec2(1.5, 1.0), 0.35 + abs(morphBase.z) * 0.2));
    vec3 dispersalDirection = normalize(outwardDirection + dispersalNoise * 0.22);
    particle.xyz += dispersalDirection * uDeltaTime * infoProgress * 14.0;

    // Decay
    particle.a += uDeltaTime * uDecayRate * (1.0 + infoProgress * 4.0);
  }

  gl_FragColor = particle;
}
