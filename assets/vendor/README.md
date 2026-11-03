# Local trophy rendering library

three-trophy.min.js contains the Three.js 0.187.0 APIs used by trophy.js, bundled as a classic browser script with esbuild 0.28.2. It exposes window.FTAPThree. The viewer loads it only as the trophy approaches the viewport or a visitor opens the viewer.

The official package source is https://registry.npmjs.org/three/-/three-0.187.0.tgz. The MIT license is preserved in three-LICENSE.txt and in the bundle's legal comments.

The bundle exports Scene, Group, Mesh, MeshStandardMaterial, MeshBasicMaterial, Shape, ExtrudeGeometry, TorusGeometry, SphereGeometry, CylinderGeometry, RingGeometry, CircleGeometry, TubeGeometry, CatmullRomCurve3, Vector2, Vector3, PerspectiveCamera, WebGLRenderer, CanvasTexture, PMREMGenerator, DirectionalLight, HemisphereLight, Quaternion, Euler, SRGBColorSpace, ACESFilmicToneMapping, RepeatWrapping, and EquirectangularReflectionMapping.

It was built from an ES module re-exporting those symbols from the official build/three.module.js, using --bundle --format=iife --global-name=FTAPThree --minify --target=es2020 --legal-comments=eof. The website needs no build step or runtime network dependency.
