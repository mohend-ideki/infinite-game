import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Trail } from "@react-three/drei";
import { BallCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { themeConfig } from "../../config/themeConfig";
import { isSlowmoActive, playerPosition, useGameSelector } from "../../store/gameStore";

/** Demi-largeur jouable de la piste (le joueur est borné sur [-X, +X]). */
export const TRACK_HALF_WIDTH = 5;
/** Hauteur de croisière de la sphère (gravité désactivée, Y constant). */
export const PLAYER_HEIGHT = 1;

const PLAYER_RADIUS = 0.6;
const LATERAL_SPEED = 11;
const MAX_SPEED = 42;
const SLOWMO_FACTOR = 0.55;

interface ControlState {
  left: boolean;
  right: boolean;
}

export function Player() {
  const bodyRef = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const controls = useRef<ControlState>({ left: false, right: false });
  const phase = useGameSelector((snapshot) => snapshot.phase);
  const shield = useGameSelector((snapshot) => snapshot.powerups.shield);

  useEffect(() => {
    const half = () => window.innerWidth / 2;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a" || key === "q") {
        controls.current.left = true;
      } else if (key === "arrowright" || key === "d") {
        controls.current.right = true;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a" || key === "q") {
        controls.current.left = false;
      } else if (key === "arrowright" || key === "d") {
        controls.current.right = false;
      }
    };

    const steerToward = (clientX: number) => {
      const isLeft = clientX < half();
      controls.current.left = isLeft;
      controls.current.right = !isLeft;
    };

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) {
        steerToward(touch.clientX);
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) {
        steerToward(touch.clientX);
      }
    };

    const releaseTouch = () => {
      controls.current.left = false;
      controls.current.right = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", releaseTouch, { passive: true });
    window.addEventListener("touchcancel", releaseTouch, { passive: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", releaseTouch);
      window.removeEventListener("touchcancel", releaseTouch);
    };
  }, []);

  useFrame((_state, delta) => {
    const body = bodyRef.current;
    if (!body) {
      return;
    }

    if (phase !== "playing") {
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    const translation = body.translation();
    playerPosition.set(translation.x, translation.y, translation.z);

    const distance = Math.max(0, translation.z);
    const slowFactor = isSlowmoActive() ? SLOWMO_FACTOR : 1;
    const forwardSpeed =
      Math.min(
        themeConfig.physics.baseSpeed + themeConfig.physics.accelerationRate * distance,
        MAX_SPEED,
      ) * slowFactor;

    let direction = 0;
    if (controls.current.left) {
      direction -= 1;
    }
    if (controls.current.right) {
      direction += 1;
    }

    let lateralVelocity = direction * LATERAL_SPEED;
    if (translation.x <= -TRACK_HALF_WIDTH && lateralVelocity < 0) {
      lateralVelocity = 0;
    }
    if (translation.x >= TRACK_HALF_WIDTH && lateralVelocity > 0) {
      lateralVelocity = 0;
    }

    body.setLinvel({ x: lateralVelocity, y: 0, z: forwardSpeed }, true);

    // Roulement visuel cohérent avec l'avance (la rotation physique est
    // verrouillée, on anime donc directement le mesh de la sphère).
    if (meshRef.current) {
      meshRef.current.rotation.x -= forwardSpeed * delta * 0.35;
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      colliders={false}
      gravityScale={0}
      enabledRotations={[false, false, false]}
      linearDamping={0}
      position={[0, PLAYER_HEIGHT, 0]}
      userData={{ type: "player" }}
    >
      <BallCollider args={[PLAYER_RADIUS]} />
      <Trail
        width={3}
        length={6}
        color={themeConfig.colors.primary}
        attenuation={(t) => t * t}
        decay={1.4}
      >
        <mesh ref={meshRef} castShadow>
          <icosahedronGeometry args={[PLAYER_RADIUS, 4]} />
          <meshStandardMaterial
            color={themeConfig.colors.primary}
            emissive={themeConfig.colors.primary}
            emissiveIntensity={0.85}
            roughness={0.25}
            metalness={0.2}
            toneMapped={false}
          />
        </mesh>
      </Trail>
      {shield ? (
        <mesh>
          <sphereGeometry args={[PLAYER_RADIUS * 1.7, 24, 24]} />
          <meshStandardMaterial
            color={themeConfig.colors.primary}
            emissive={themeConfig.colors.primary}
            emissiveIntensity={0.5}
            transparent
            opacity={0.22}
            roughness={0.1}
            metalness={0.3}
            toneMapped={false}
          />
        </mesh>
      ) : null}
      <pointLight color={themeConfig.colors.primary} intensity={6} distance={9} decay={2} />
    </RigidBody>
  );
}
