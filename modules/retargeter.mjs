import * as THREE from 'three';

// Constants
const HIPS_HEIGHT_M = 1.037; // Reference model's hip height
const EYE_HEIGHT_M = 1.634; // Reference model's eye height
const MIXAMO_BONES = [
    "Hips", "Spine", "Spine1", "Spine2", "Neck", "Head",
    "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
    "RightShoulder", "RightArm", "RightForeArm", "RightHand",
    "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase",
    "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase",
    "LeftHandThumb1", "LeftHandThumb2", "LeftHandThumb3",
    "LeftHandIndex1", "LeftHandIndex2", "LeftHandIndex3",
    "LeftHandMiddle1", "LeftHandMiddle2", "LeftHandMiddle3",
    "LeftHandRing1", "LeftHandRing2", "LeftHandRing3",
    "LeftHandPinky1", "LeftHandPinky2", "LeftHandPinky3",
    "RightHandThumb1", "RightHandThumb2", "RightHandThumb3",
    "RightHandIndex1", "RightHandIndex2", "RightHandIndex3",
    "RightHandMiddle1", "RightHandMiddle2", "RightHandMiddle3",
    "RightHandRing1", "RightHandRing2", "RightHandRing3",
    "RightHandPinky1", "RightHandPinky2", "RightHandPinky3"
];


/**
* Checks whether the given skeleton matches a Mixamo bone structure.
*
* @param {Object} skeleton Skeleton object
* @returns {boolean} True if all Mixamo bones are present.
*/
function isMixamoSkeleton(skeleton) {
  const boneNames = new Set(skeleton.bones.map(b => b.name));
  return MIXAMO_BONES.every(name => boneNames.has(name));
}


/**
* Finds all unique Mixamo skeletons in a root object.
*
* @param {Object} root Root object to traverse
* @returns {Array} Array of Mixamo skeletons.
*/
function findMixamoSkeletons(root) {
  const skeletons = new Set();
  root.traverse((object) => {
    if (object.isSkinnedMesh && object.skeleton && isMixamoSkeleton(object.skeleton)) {
      skeletons.add(object.skeleton);
    }
  });
  return Array.from(skeletons);
}

/**
* Rebinds a skeleton to its meshes, preserving current deformations.
*
* @param {THREE.Skeleton} skeleton Skeleton to rebind
* @param {THREE.Object3D} root Root object containing skinned meshes.
*/
function rebindSkeleton(skeleton, root) {

  // Update matrices for new bone orientations
  const originalScale = root.scale.clone();
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);
  skeleton.bones.forEach(b => b.updateMatrixWorld(true));

  // Capture old bone world matrices before transforming vertices
  const oldBoneWorldMatrices = skeleton.bones.map(b => b.matrixWorld.clone());

  // Skinned meshes with the specific skeleton
  const meshes = [];
  root.traverse((obj) => {
    if (obj.isSkinnedMesh && obj.skeleton === skeleton) meshes.push(obj);
  });

  meshes.forEach(mesh => {
    const posAttr = mesh.geometry.attributes.position;
    const skinIndex = mesh.geometry.attributes.skinIndex;
    const skinWeight = mesh.geometry.attributes.skinWeight;

    const vertex = new THREE.Vector3();
    const skinnedWorld = new THREE.Vector3();
    const tempMat = new THREE.Matrix4();

    for (let i = 0; i < posAttr.count; i++) {
      vertex.fromBufferAttribute(posAttr, i);
      skinnedWorld.set(0, 0, 0);

      const bIndices = [
        skinIndex.getX(i),
        skinIndex.getY(i),
        skinIndex.getZ(i),
        skinIndex.getW(i)
      ];
      const weights = [
        skinWeight.getX(i),
        skinWeight.getY(i),
        skinWeight.getZ(i),
        skinWeight.getW(i)
      ];

      for (let j = 0; j < 4; j++) {
        const bIndex = bIndices[j];
        const weight = weights[j];
        if (!weight || bIndex === undefined) continue;

        tempMat.multiplyMatrices(oldBoneWorldMatrices[bIndex], skeleton.boneInverses[bIndex]);
        const v = vertex.clone().applyMatrix4(tempMat).multiplyScalar(weight);
        skinnedWorld.add(v);
      }

      posAttr.setXYZ(i, skinnedWorld.x, skinnedWorld.y, skinnedWorld.z);
    }

    posAttr.needsUpdate = true;

    // Recompute normals for proper lighting
    mesh.geometry.computeVertexNormals();
    if (mesh.geometry.attributes.tangent) {
      mesh.geometry.computeTangents();
    }

  });

  // Recalculate boneInverses for this skeleton
  skeleton.boneInverses = skeleton.bones.map(b => new THREE.Matrix4().copy(b.matrixWorld).invert());
  skeleton.pose();

  // Restore root scale
  root.scale.copy(originalScale);
  root.updateMatrixWorld(true);

}

/**
 * Applies a positional and/or rotational delta to a bone while preserving
 * descendant world transforms.
 *
 * @param {string} boneName Name of the bone to transform
 * @param {THREE.Skeleton} skeleton Skeleton containing the bone
 * @param {THREE.Vector3} [positionDelta] Position offset to apply
 * @param {THREE.Euler} [rotationDelta] Rotation offset to apply.
 */
function transform(boneName, skeleton, positionDelta, rotationDelta) {

  // Find the bone
  const bone = skeleton.bones.find(bone => bone.name === boneName);
  if ( !bone ) return;

  // Save world matrices of all descendants recursively
  const savedWorldTransforms = [];
  function saveWorld(b) {
    b.updateWorldMatrix(true, false);
    savedWorldTransforms.push({ bone: b, matrixWorld: b.matrixWorld.clone() });
    b.children.forEach( c => {
      if ( MIXAMO_BONES.includes(c.name) ) {
        saveWorld(c);
      }
    });
  }
  saveWorld(bone);

  // Apply position delta
  if ( positionDelta ) {
      bone.position.x += positionDelta.x || 0;
      bone.position.y += positionDelta.y || 0;
      bone.position.z += positionDelta.z || 0;
  }

  // Apply rotation delta (Euler)
  if ( rotationDelta ) {
      bone.rotation.x += rotationDelta.x || 0;
      bone.rotation.y += rotationDelta.y || 0;
      bone.rotation.z += rotationDelta.z || 0;
  }

  bone.updateMatrixWorld(true);

  // Restore descendants world transforms
  savedWorldTransforms.forEach(({ bone: desc, matrixWorld }) => {
    if (desc === bone) return; // skip the root bone itself

    const parentWorldMatrix = new THREE.Matrix4();
    if (desc.parent) {
      desc.parent.updateWorldMatrix(true, false);
      parentWorldMatrix.copy(desc.parent.matrixWorld).invert();
    } else {
      parentWorldMatrix.identity();
    }

    const localMatrix = new THREE.Matrix4();
    localMatrix.multiplyMatrices(parentWorldMatrix, matrixWorld);
    localMatrix.decompose(desc.position, desc.quaternion, desc.scale);
    desc.updateMatrixWorld(true); // force update to avoid drift
  });

}

/**
* Uniformly scales a rig so the given bone reaches a target world-space height.
* 
* @param {THREE.Object3D} root Root object of the rig
* @param {string} boneName Name of the bone
* @param {number} targetHeight Desired bone height in world units.
*/
function scale(root, boneName, targetHeight) {

    // Ensure matrices are current
    root.updateWorldMatrix(true, true);

    // Find a Hips bone
    let bone = null;
    root.traverse(obj => {
        if (obj.isBone && obj.name === boneName) {
            bone = obj;
        }
    });
    if (!bone) {
      console.warn('Retarget: No "' + boneName + '" bone found.');
      return;
    }

    // Get hips world position
    const boneWorldPos = new THREE.Vector3();
    bone.getWorldPosition(boneWorldPos);

    const currentHeight = boneWorldPos.y;

    if (currentHeight === 0) {
      console.warn("Retargeter: Bone height is zero, can't scale.");
      return;
    }

    const scaleFactor = targetHeight / currentHeight;

    // Apply uniform scale
    root.scale.multiplyScalar(scaleFactor);

    // Force matrix updates
    root.updateMatrixWorld(true);
}


/**
* Retargets all Mixamo skeletons under a root object by applying specified bone
* transforms and optional hip scaling.
* 
* @param {THREE.Object3D} root Root object
* @param {Object} [transforms={}] Map of options or bone names with transform data
*   @param {Object} [transforms.boneName] Position and rotation deltas for a specific bone ({x, y, z, rx, ry, rz}).
*   @param {boolean} [transforms.ScaleHips] Whether to scale the rig's hips to a target height.
*/
export function retarget(root, transforms = {}) {

  // Find all skeletons
  const skeletons = findMixamoSkeletons(root);
  if ( skeletons.length === 0 ) {
    console.warn('Retarget: No mixamo skeleton found.');
    return;
  }

  // Process all skeletons
  skeletons.forEach( skeleton => {

    // Apply rest pose
    skeleton.pose();

    // Get all unique bone names
    const boneNames = [...new Set(skeleton.bones.map(bone => bone.name))];

    // Process transforms and options
    let isTransform = false;
    let scaleToHipsLevel = null;
    let scaleToEyesLevel = null;
    let origin = null;
    for( let [key,val] of Object.entries(transforms) ) {

      // Process
      if ( key === "scaleToHipsLevel" ) {
        scaleToHipsLevel = val;
      } else if ( key === "scaleToEyesLevel" ) {
        scaleToEyesLevel = val;
      } else if ( key === "origin" ) {
        origin = val;
      } else if ( boneNames.includes(key) ) {
        transform( key, skeleton, { x: val.x, y: val.y, z: val.z }, { x: val.rx, y: val.ry, z: val.rz });
        isTransform = true;
      } else  {
        console.warn('Retarget: Unknown key "' + key + '".');
      }

    }

    // Apply transforms to meshes
    if ( isTransform ) {
      rebindSkeleton(skeleton, root);
    } 

    // Scale
    if ( scaleToEyesLevel !== null ) {
      scale(root, 'LeftEye', EYE_HEIGHT_M * scaleToEyesLevel);
    } else if ( scaleToHipsLevel !== null ) {
      scale(root, 'Hips', HIPS_HEIGHT_M * scaleToHipsLevel);
    }

    // Origin shift
    if ( origin ) {
      root.position.x += origin.x || 0;
      root.position.y += origin.y || 0;
      root.position.z += origin.z || 0;
      root.updateMatrixWorld(true);
    }
    
  });

}
