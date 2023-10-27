import { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import useSWR from "swr";
import { fetcher } from "../../utils/functions";
import { UMAP } from "umap-js";

function Viewer({ embeddings }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Initialize scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
      width / -2,
      width / 2,
      height / 2,
      height / -2,
      1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0xffffff, 1); // 0xffffff is white in hexadecimal
    containerRef.current.appendChild(renderer.domElement);

    // Add lights (optional)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(25, 50, 25);
    scene.add(pointLight);

    // Plot the embeddings
    embeddings.forEach((embedding) => {
      const geometry = new THREE.SphereGeometry(0.1);
      const sphere = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial());

      sphere.position.set(embedding[0], embedding[1], embedding[2]);
      scene.add(sphere);
    });

    camera.position.z = 50;

    // Create an AxesHelper instance
    const axesHelper = new THREE.AxesHelper(5);

    // Add it to your scene
    scene.add(axesHelper);

    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.autoRotate = true;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update(); // Required if controls.enableDamping or controls.autoRotate are set to true
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      controls.dispose();
      renderer.dispose();
    };
  }, [embeddings]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}></div>
  );
}

export default function Memory() {
  const { data: embeddings } = useSWR(
    "http://localhost:3002/embeddings",
    fetcher,
    {
      fallbackData: [],
    }
  );

  console.log(embeddings);

  if (embeddings.length > 0) {
    const matrix = embeddings.map((embedding) =>
      JSON.parse(embedding.embedding)
    );

    const umap = new UMAP({ nComponents: 3 });
    const reducedData = umap.fit(matrix);

    return <Viewer embeddings={reducedData} />;
  } else {
    return null;
  }
}
