/**
 * Draw distant object with the planet shader as a sphere.
 * 
 * @param {*} rEFI 
 *      Coordinates of the object in the EFI frame.
 * @param {*} rObject 
 *      Radius of the object sphere (in meters).
 * @param {*} matrix 
 *      View matrix.
 * @param {*} drawSub 
 *      Draw point of the Earth below the target.
 * @param {*} drawSubline
 *      Draw line between the Earth and the target.
 */
 function drawDistant(rEFI, rObject, matrix, drawSub, drawSubline)
 {
     // Due to how depth buffer works, it is not feasible to draw objects 
     // like the Sun millions of kilometers away. Rather, they are drawn 
     // to the maximum distance while retaining the angular diameter.
 
     // The following assumes that the observer is close to the center
     // of the Earth.
 
     // Angular diameter of the object as seen from the center of the Earth.
     const angDiam = 2 * orbitsjs.atand(rObject / orbitsjs.norm(rEFI));
 
     // Distance to the object in the visualization space.
     const D = 0.5 * camera.zFar;
 
     // angDiam = 2 * atand(diameter / (2 * D));
     // <=> diameter / (2 * D) = tand(andDiam/2)
     // <=> diameter = 2 * D * tand(angDiam/2)
 
     const rSphere = D * orbitsjs.tand(angDiam / 2);
     const scale = rSphere / a;
 
     const targetPos = orbitsjs.vecMul(rEFI, D / orbitsjs.norm(rEFI));
 
     let targetMatrix = m4.translate(matrix, targetPos[0], targetPos[1], targetPos[2]);
     targetMatrix = m4.scale(targetMatrix, scale, scale, scale);
 
     earthShaders.draw(targetMatrix, false, false, false, false);

     if (drawSubline)
     {
         const pLine = [targetPos];
         // Distance to the object in the visualization space.
         const D = 0.5 * zFar;
         let {lat, lon, h} = orbitsjs.coordEfiWgs84(targetPos); 
         pLine.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(lat, lon, 0), 0.001));

         //console.log(pLine);
         lineShaders.setGeometry(pLine);
         lineShaders.draw(matrix);
     }
 
     if (drawSub)
     {
         const pLine = [];
         // Distance to the object in the visualization space.
         const D = 0.5 * camera.zFar;
         let {lat, lon, h} = orbitsjs.coordEfiWgs84(targetPos); 
         pLine.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(lat+1, lon, 0), 0.001));
         pLine.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(lat-1, lon, 0), 0.001));
         pLine.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(lat, lon+1, 0), 0.001));
         pLine.push(orbitsjs.vecMul(orbitsjs.coordWgs84Efi(lat, lon-1, 0), 0.001));
     
         //console.log(pLine);
         lineShaders.setGeometry(pLine);
         lineShaders.draw(matrix);
     }
 }