import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Small three.js proof-of-concept: a low-poly car slowly rotating above a
 * parking-slot outline. Self-contained - owns its own scene/renderer
 * lifecycle and disposes everything on unmount. Not wired into any other
 * feature; a starting point to build a real 3D layout preview from later.
 */
export function ParkingScene3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(3.2, 2.6, 4.2);
    camera.lookAt(0, 0.3, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(4, 6, 3);
    scene.add(keyLight);

    // Parking slot outline on the ground.
    const slot = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-1.4, 0, -2.2),
        new THREE.Vector3(1.4, 0, -2.2),
        new THREE.Vector3(1.4, 0, 2.2),
        new THREE.Vector3(-1.4, 0, 2.2),
      ]),
      new THREE.LineBasicMaterial({ color: 0x14b8a6 }),
    );
    scene.add(slot);

    // Stylized low-poly car: body + cabin + four wheels.
    const car = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.5, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x0f2042, roughness: 0.4, metalness: 0.2 }),
    );
    body.position.y = 0.5;
    car.add(body);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.5, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.3, metalness: 0.1 }),
    );
    cabin.position.set(0, 1, -0.2);
    car.add(cabin);

    const wheelGeometry = new THREE.CylinderGeometry(0.32, 0.32, 0.3, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
    const wheelPositions: Array<[number, number]> = [
      [-0.9, -1.1],
      [0.9, -1.1],
      [-0.9, 1.1],
      [0.9, 1.1],
    ];

    for (const [x, z] of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.32, z);
      car.add(wheel);
    }

    scene.add(car);

    let frameId: number;
    function animate() {
      car.rotation.y += 0.008;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    animate();

    const resizeObserver = new ResizeObserver(() => {
      const nextWidth = container.clientWidth;
      const nextHeight = container.clientHeight;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      container.removeChild(renderer.domElement);
      renderer.dispose();
      [body, cabin].forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      wheelGeometry.dispose();
      wheelMaterial.dispose();
      slot.geometry.dispose();
      (slot.material as THREE.Material).dispose();
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" aria-hidden="true" />;
}
