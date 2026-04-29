uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
uniform vec3 uLightDirection;
uniform float uAmbientLight;
uniform float uDiffuseLight;
uniform float uSpecularLight;
uniform float uShininess;

varying vec3 vColor;
varying float vFogDepth;

void main() {
  // Map gl_PointCoord to [-1, 1]
  vec2 coord = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(coord, coord);

  if(r2 > 1.0)
      discard;

  // Reconstruct sphere normal
  vec3 normal = vec3(coord, sqrt(1.0 - r2));

  vec3 lightDir = length(uLightDirection) > 0.0001 ? normalize(uLightDirection) : vec3(0.0, 0.0, 1.0);

  // Diffuse
  float diffuse = max(dot(normal, lightDir), 0.0);

  // Specular (Blinn-Phong)
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  vec3 halfDir = normalize(lightDir + viewDir);
  float specular = pow(max(dot(normal, halfDir), 0.0), uShininess);

  // Ambient + diffuse + specular
  vec3 color = vColor * (uAmbientLight + uDiffuseLight * diffuse) + vec3(uSpecularLight) * specular;

  // Fog
  float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
  color = mix(color, fogColor, fogFactor);

  gl_FragColor = vec4(color, 1.0);
}
