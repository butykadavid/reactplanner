/**
 * Build a nested tree structure from a flat components array.
 * Returns an array of root nodes, each with a `children` array.
 */
export function buildTree(components) {
  const map = {};
  components.forEach((c) => {
    map[c.id] = { ...c, children: [] };
  });
  const roots = [];
  components.forEach((c) => {
    if (c.parentId && map[c.parentId]) {
      map[c.parentId].children.push(map[c.id]);
    } else {
      roots.push(map[c.id]);
    }
  });
  return roots;
}

/**
 * Returns an ordered array of ancestor IDs from root down to (but not including) nodeId.
 */
export function getAncestors(nodeId, components) {
  const byId = Object.fromEntries(components.map((c) => [c.id, c]));
  const ancestors = [];
  let current = byId[nodeId];
  while (current && current.parentId) {
    ancestors.unshift(current.parentId);
    current = byId[current.parentId];
  }
  return ancestors;
}

/**
 * Returns the depth of a node from the root (root = 0).
 */
export function getDepth(nodeId, components) {
  return getAncestors(nodeId, components).length;
}

/**
 * Returns an array of all descendant IDs (not including nodeId itself).
 */
export function getDescendants(nodeId, components) {
  const results = [];
  const collect = (id) => {
    const children = components.filter((c) => c.parentId === id);
    children.forEach((c) => {
      results.push(c.id);
      collect(c.id);
    });
  };
  collect(nodeId);
  return results;
}

/**
 * Returns the Lowest Common Ancestor ID of a set of node IDs.
 * Returns null if nodeIds is empty.
 */
export function getLCA(nodeIds, components) {
  if (!nodeIds || nodeIds.length === 0) return null;

  // Filter to only valid ids
  const valid = nodeIds.filter((id) => components.some((c) => c.id === id));
  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0];

  // Get ancestor chains (root → node, inclusive of the node itself)
  const chains = valid.map((id) => [...getAncestors(id, components), id]);

  // Walk chains together from root, stop when they diverge
  let lca = null;
  const minLen = Math.min(...chains.map((c) => c.length));
  for (let depth = 0; depth < minLen; depth++) {
    const candidate = chains[0][depth];
    if (chains.every((chain) => chain[depth] === candidate)) {
      lca = candidate;
    } else {
      break;
    }
  }

  return lca;
}
