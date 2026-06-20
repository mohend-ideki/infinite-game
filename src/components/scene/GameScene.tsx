import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import { themeConfig } from "../../config/themeConfig";
import { playerPosition, useGameSelector } from "../../store/gameStore";
import { effectsBus } from "../../effects/effectsBus";
import { Player } from "./Player";
import { WorldGenerator } from "./WorldGenerator";
import { ParticleBursts, PostFx } from "./Effects";

const BASE_FOV = 62;

/**
 * Suivi de caméra par interpolation (Lerp) indépendant du framerate, avec
 * secousse à l'impact et léger "punch" de FOV sur les bonus rares.
 */
function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera } = useThree();
  const desiredPosition = useRef(new THREE.Vector3(0, 6, -10));
  const lookTarget = useRef(new THREE.Vector3());
  const shake = useRef(0);
  const fovKick = useRef(0);

  useEffect(() => {
    const offShake = effectsBus.on("shake", ({ intensity }) => {
      if (reducedMotion) {
        return;
      }
      shake.current = Math.min(1.2, shake.current + intensity * 0.6);
    });
    const offBurst = effectsBus.on("burst", ({ rare }) => {
      if (rare && !reducedMotion) {
        fovKick.current = 6;
      }
    });
    return () => {
      offShake();
      offBurst();
    };
  }, [reducedMotion]);

  useFrame((_state, delta) => {
    desiredPosition.current.set(
      playerPosition.x * 0.55,
      playerPosition.y + 5,
      playerPosition.z - 9,
    );

    const smoothing = 1 - Math.pow(0.0015, delta);
    camera.position.lerp(desiredPosition.current, smoothing);

    if (shake.current > 0.001) {
      camera.position.x += (Math.random() - 0.5) * shake.current;
      camera.position.y += (Math.random() - 0.5) * shake.current;
      shake.current *= Math.pow(0.02, delta);
    }

    lookTarget.current.set(
      playerPosition.x * 0.35,
      playerPosition.y,
      playerPosition.z + 13,
    );
    camera.lookAt(lookTarget.current);

    if (fovKick.current > 0.01 && camera instanceof THREE.PerspectiveCamera) {
      fovKick.current *= Math.pow(0.01, delta);
      camera.fov = BASE_FOV + fovKick.current;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

export function GameScene() {
  const phase = useGameSelector((snapshot) => snapshot.phase);
  const reducedMotion = useGameSelector((snapshot) => snapshot.settings.reducedMotion);
  const simulationPaused = phase !== "playing";

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 6, -10], fov: BASE_FOV, near: 0.1, far: 200 }}
    >
      <color attach="background" args={[themeConfig.colors.background]} />
      <fog attach="fog" args={[themeConfig.colors.background, 28, 78]} />

      <Stars radius={140} depth={70} count={1400} factor={4} saturation={0} fade speed={reducedMotion ? 0 : 0.4} />

      <ambientLight intensity={0.45} />
      <hemisphereLight
        intensity={0.5}
        color={themeConfig.colors.accent}
        groundColor={themeConfig.colors.background}
      />
      <directionalLight
        castShadow
        position={[12, 24, 6]}
        intensity={1.4}
        color={themeConfig.colors.accent}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      <Physics
        gravity={[0, -themeConfig.physics.gravity, 0]}
        paused={simulationPaused}
        timeStep="vary"
      >
        <Player />
        <WorldGenerator />
      </Physics>

      <ParticleBursts />
      <CameraRig reducedMotion={reducedMotion} />
      <PostFx reducedMotion={reducedMotion} />
    </Canvas>
  );
}
