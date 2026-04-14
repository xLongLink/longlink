import { JsonNode, ComponentNode, TransformVisitor, TransformContext, TransformOptions, isComponentNode, isPrimitiveNode, isArrayNode } from './types';

/**
 * Default transform options
 */
const defaultOptions: TransformOptions = {
  order: 'depthFirstPre',
  clone: true
};

/**
 * Creates a transform context object for a node
 */
function createContext(
  node: JsonNode,
  parent: ComponentNode | null,
  index: number,
  depth: number
): TransformContext {
  const context: TransformContext = {
    depth,
    parent,
    index,
    shouldSkipChildren: false,
    skipChildren() {
      context.shouldSkipChildren = true;
    }
  };
  return context;
}

/**
 * Transforms a JSON tree by applying visitors to each node
 */
export async function transformJsonTree(
  root: JsonNode,
  visitors: TransformVisitor[],
  options: TransformOptions = defaultOptions
): Promise<JsonNode> {
  // Skip transformation if there are no visitors
  if (visitors.length === 0) {
    return root;
  }
  
  // If it's a primitive, apply transformations
  if (isPrimitiveNode(root)) {
    let node: JsonNode = root;
    const context = createContext(node, null, 0, 0);
    
    // Apply enter visitors
    for (const visitor of visitors) {
      if (visitor.enter) {
        const result = await visitor.enter(node, context);
        if (result !== undefined) {
          node = result;
          // If node was transformed to a non-primitive, stop primitive processing
          if (!isPrimitiveNode(node)) {
            return node;
          }
        }
      }
    }
    
    // Apply exit visitors
    for (const visitor of visitors) {
      if (visitor.exit) {
        const result = await visitor.exit(node, context);
        if (result !== undefined) {
          node = result;
          // If node was transformed to a non-primitive, stop primitive processing
          if (!isPrimitiveNode(node)) {
            break;
          }
        }
      }
    }
    
    return node;
  }
  
  // If it's an array, transform each element
  if (isArrayNode(root)) {
    const shouldClone = options.clone ?? defaultOptions.clone;
    const clonedArray = shouldClone ? [...root] : root;
    
    // Transform each element in the array
    for (let i = 0; i < clonedArray.length; i++) {
      clonedArray[i] = await transformJsonTree(clonedArray[i], visitors, options);
    }
    
    return clonedArray;
  }
  
  // At this point we know it's a ComponentNode
  // Clone the input only if requested (default) to avoid mutating the original
  const rootNode = options.clone ?? defaultOptions.clone 
    ? JSON.parse(JSON.stringify(root))
    : root;
  
  // Choose traversal strategy based on the order option
  const order = options.order ?? defaultOptions.order;
  
  switch (order) {
    case 'depthFirstPre':
      await depthFirstPreOrder(rootNode, visitors);
      break;
    case 'depthFirstPost':
      await depthFirstPostOrder(rootNode, visitors);
      break;
    case 'breadthFirst':
      await breadthFirst(rootNode, visitors);
      break;
    default:
      throw new Error(`Invalid traversal order: ${order}`);
  }
  
  return rootNode;
}

/**
 * Performs depth-first pre-order traversal of the JSON tree
 */
async function depthFirstPreOrder(
  node: JsonNode, 
  visitors: TransformVisitor[],
  parent: ComponentNode | null = null,
  index = 0,
  depth = 0
): Promise<void> {
  // For primitives, just apply visitors and return
  if (isPrimitiveNode(node)) {
    // Primitive nodes are handled separately in transformJsonTree
    return;
  }
  
  // For arrays, process each item
  if (isArrayNode(node)) {
    for (let i = 0; i < node.length; i++) {
      await depthFirstPreOrder(node[i], visitors, parent, i, depth);
    }
    return;
  }
  
  // From here we know it's a component node
  // Create context for this node
  const context = createContext(node, parent, index, depth);
  
  // Run enter visitors
  for (const visitor of visitors) {
    if (visitor.enter) {
      const result = await visitor.enter(node, context);
      if (result !== undefined) {
        // If the node was transformed, we stop traversal for this node
        // as the structure might have changed
        return;
      }
    }
  }
  
  // Process children if they exist and are not skipped
  if (isComponentNode(node) && node.children && !context.shouldSkipChildren) {
    await processChildren(node.children, visitors, node, depth);
  }
  
  // Run exit visitors
  for (const visitor of visitors) {
    if (visitor.exit) {
      const result = await visitor.exit(node, context);
      if (result !== undefined) {
        // Same as for enter, if node was transformed we stop here
        return;
      }
    }
  }
}

/**
 * Process children of a node which can be a single node or an array
 */
async function processChildren(
  children: JsonNode | JsonNode[],
  visitors: TransformVisitor[],
  parent: ComponentNode,
  depth: number
): Promise<void> {
  if (isArrayNode(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      await depthFirstPreOrder(child, visitors, parent, i, depth + 1);
    }
  } else {
    await depthFirstPreOrder(children, visitors, parent, 0, depth + 1);
  }
}

/**
 * Performs depth-first post-order traversal of the JSON tree
 */
async function depthFirstPostOrder(
  node: JsonNode, 
  visitors: TransformVisitor[],
  parent: ComponentNode | null = null,
  index = 0,
  depth = 0
): Promise<void> {
  // For primitives, just apply visitors and return
  if (isPrimitiveNode(node)) {
    // Primitive nodes are handled separately in transformJsonTree
    return;
  }
  
  // For arrays, process each item
  if (isArrayNode(node)) {
    for (let i = 0; i < node.length; i++) {
      await depthFirstPostOrder(node[i], visitors, parent, i, depth);
    }
    return;
  }
  
  // From here we know it's a component node
  // Create context for this node
  const context = createContext(node, parent, index, depth);
  
  // Process children first if they exist and are not skipped
  if (isComponentNode(node) && node.children && !context.shouldSkipChildren) {
    await processChildrenPostOrder(node.children, visitors, node, depth);
  }
  
  // Run enter visitors
  for (const visitor of visitors) {
    if (visitor.enter) {
      const result = await visitor.enter(node, context);
      if (result !== undefined) {
        // If the node was transformed, we stop traversal for this node
        return;
      }
    }
  }
  
  // Run exit visitors
  for (const visitor of visitors) {
    if (visitor.exit) {
      const result = await visitor.exit(node, context);
      if (result !== undefined) {
        // If the node was transformed, we stop traversal for this node
        return;
      }
    }
  }
}

/**
 * Process children of a node for post-order traversal
 */
async function processChildrenPostOrder(
  children: JsonNode | JsonNode[],
  visitors: TransformVisitor[],
  parent: ComponentNode,
  depth: number
): Promise<void> {
  if (isArrayNode(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      await depthFirstPostOrder(child, visitors, parent, i, depth + 1);
    }
  } else {
    await depthFirstPostOrder(children, visitors, parent, 0, depth + 1);
  }
}

/**
 * Performs breadth-first traversal of the JSON tree
 */
async function breadthFirst(
  root: JsonNode, 
  visitors: TransformVisitor[]
): Promise<void> {
  // For primitives, just apply visitors and return
  if (isPrimitiveNode(root)) {
    // Primitive nodes are handled separately in transformJsonTree
    return;
  }
  
  // For arrays, process each item separately in a breadth-first manner
  if (isArrayNode(root)) {
    for (let i = 0; i < root.length; i++) {
      await breadthFirst(root[i], visitors);
    }
    return;
  }
  
  // From here we know it's a component node
  const queue: Array<{
    node: JsonNode;
    parent: ComponentNode | null;
    index: number;
    depth: number;
  }> = [{ node: root, parent: null, index: 0, depth: 0 }];
  
  while (queue.length > 0) {
    const { node, parent, index, depth } = queue.shift()!;
    
    // Skip primitives - they are handled separately in transformJsonTree
    if (isPrimitiveNode(node)) {
      continue;
    }
    
    // Skip arrays - we process them differently
    if (isArrayNode(node)) {
      for (let i = 0; i < node.length; i++) {
        queue.push({
          node: node[i],
          parent,
          index: i,
          depth
        });
      }
      continue;
    }
    
    // Create context for this node
    const context = createContext(node, parent, index, depth);
    
    // Run enter visitors
    let shouldContinue = true;
    for (const visitor of visitors) {
      if (visitor.enter) {
        const result = await visitor.enter(node, context);
        if (result !== undefined) {
          // If the node was transformed, we stop processing this node
          shouldContinue = false;
          break;
        }
      }
    }
    
    if (!shouldContinue) {
      continue;
    }
    
    // Run exit visitors
    for (const visitor of visitors) {
      if (visitor.exit) {
        const result = await visitor.exit(node, context);
        if (result !== undefined) {
          // If the node was transformed, we stop processing
          shouldContinue = false;
          break;
        }
      }
    }
    
    if (!shouldContinue) {
      continue;
    }
    
    // Add children to queue if they exist and are not skipped
    if (isComponentNode(node) && node.children && !context.shouldSkipChildren) {
      await enqueueChildren(queue, node.children, node, depth);
    }
  }
}

/**
 * Enqueues children for breadth-first traversal
 */
async function enqueueChildren(
  queue: Array<{node: JsonNode, parent: ComponentNode | null, index: number, depth: number}>,
  children: JsonNode | JsonNode[],
  parent: ComponentNode,
  depth: number
): Promise<void> {
  if (isArrayNode(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      queue.push({
        node: child,
        parent,
        index: i,
        depth: depth + 1
      });
    }
  } else {
    queue.push({
      node: children,
      parent,
      index: 0,
      depth: depth + 1
    });
  }
}

/**
 * Options for traversal
 */
export interface TraverseOptions extends TransformOptions {
  nodeTypes?: string[]; // Filter nodes by type (only applies to ComponentNodes)
}

/**
 * Traverses a JSON tree and yields each node with its context
 */
export function* traverseJsonTree(
  root: JsonNode,
  options: TraverseOptions = {}
): Generator<{node: JsonNode, context: TransformContext}, void, void> {
  // If it's a primitive, yield it
  if (isPrimitiveNode(root)) {
    const context = createContext(root, null, 0, 0);
    yield { node: root, context };
    return;
  }
  
  if (isArrayNode(root)) {
    for (let i = 0; i < root.length; i++) {
      yield* traverseJsonTree(root[i], options);
    }
    return;
  }
  
  // Clone the input if requested (default: false for traverseJsonTree)
  const shouldClone = options.clone ?? false;
  const rootNode = shouldClone 
    ? JSON.parse(JSON.stringify(root))
    : root;
  
  const order = options.order || 'depthFirstPre';
  const nodeTypes = options.nodeTypes;
  
  switch (order) {
    case 'depthFirstPre':
      yield* traverseDepthFirstPre(rootNode, nodeTypes);
      break;
    case 'depthFirstPost':
      yield* traverseDepthFirstPost(rootNode, nodeTypes);
      break;
    case 'breadthFirst':
      yield* traverseBreadthFirst(rootNode, nodeTypes);
      break;
    default:
      throw new Error(`Invalid traversal order: ${order}`);
  }
}

/**
 * Generator for depth-first pre-order traversal
 */
function* traverseDepthFirstPre(
  node: JsonNode, 
  nodeTypes?: string[],
  parent: ComponentNode | null = null,
  index = 0,
  depth = 0
): Generator<{node: JsonNode, context: TransformContext}, void, void> {
  // For primitives, just yield with context
  if (isPrimitiveNode(node)) {
    const context = createContext(node, parent, index, depth);
    yield { node, context };
    return;
  }
  
  // Handle arrays
  if (isArrayNode(node)) {
    for (let i = 0; i < node.length; i++) {
      yield* traverseDepthFirstPre(node[i], nodeTypes, parent, i, depth);
    }
    return;
  }
  
  // Create context for this node
  const context = createContext(node, parent, index, depth);
  
  // Yield the node if it matches the filter or if no filter is provided
  if (!nodeTypes || 
      (isComponentNode(node) && nodeTypes.includes(node.type))) {
    yield { node, context };
  }
  
  // Process children if they exist and are not skipped
  if (isComponentNode(node) && node.children && !context.shouldSkipChildren) {
    yield* traverseChildrenPreOrder(node.children, node, depth, nodeTypes);
  }
}

/**
 * Traverse children for pre-order depth-first
 */
function* traverseChildrenPreOrder(
  children: JsonNode | JsonNode[],
  parent: ComponentNode,
  depth: number,
  nodeTypes?: string[]
): Generator<{node: JsonNode, context: TransformContext}, void, void> {
  if (isArrayNode(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      yield* traverseDepthFirstPre(child, nodeTypes, parent, i, depth + 1);
    }
  } else {
    yield* traverseDepthFirstPre(children, nodeTypes, parent, 0, depth + 1);
  }
}

/**
 * Generator for depth-first post-order traversal
 */
function* traverseDepthFirstPost(
  node: JsonNode, 
  nodeTypes?: string[],
  parent: ComponentNode | null = null,
  index = 0,
  depth = 0
): Generator<{node: JsonNode, context: TransformContext}, void, void> {
  // For primitives, just yield with context
  if (isPrimitiveNode(node)) {
    const context = createContext(node, parent, index, depth);
    yield { node, context };
    return;
  }
  
  // Handle arrays
  if (isArrayNode(node)) {
    for (let i = 0; i < node.length; i++) {
      yield* traverseDepthFirstPost(node[i], nodeTypes, parent, i, depth);
    }
    return;
  }
  
  // Create context for this node
  const context = createContext(node, parent, index, depth);
  
  // Process children first if they exist and are not skipped
  if (isComponentNode(node) && node.children && !context.shouldSkipChildren) {
    yield* traverseChildrenPostOrder(node.children, node, depth, nodeTypes);
  }
  
  // Yield the node if it matches the filter or if no filter is provided
  if (!nodeTypes || 
      (isComponentNode(node) && nodeTypes.includes(node.type))) {
    yield { node, context };
  }
}

/**
 * Traverse children for post-order depth-first
 */
function* traverseChildrenPostOrder(
  children: JsonNode | JsonNode[],
  parent: ComponentNode,
  depth: number,
  nodeTypes?: string[]
): Generator<{node: JsonNode, context: TransformContext}, void, void> {
  if (isArrayNode(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      yield* traverseDepthFirstPost(child, nodeTypes, parent, i, depth + 1);
    }
  } else {
    yield* traverseDepthFirstPost(children, nodeTypes, parent, 0, depth + 1);
  }
}

/**
 * Generator for breadth-first traversal
 */
function* traverseBreadthFirst(
  root: JsonNode, 
  nodeTypes?: string[]
): Generator<{node: JsonNode, context: TransformContext}, void, void> {
  // For primitives, just yield with context
  if (isPrimitiveNode(root)) {
    const context = createContext(root, null, 0, 0);
    yield { node: root, context };
    return;
  }
  
  // Handle arrays
  if (isArrayNode(root)) {
    for (let i = 0; i < root.length; i++) {
      yield* traverseBreadthFirst(root[i], nodeTypes);
    }
    return;
  }
  
  const queue: Array<{
    node: JsonNode;
    parent: ComponentNode | null;
    index: number;
    depth: number;
  }> = [{ node: root, parent: null, index: 0, depth: 0 }];
  
  while (queue.length > 0) {
    const { node, parent, index, depth } = queue.shift()!;
    
    // For primitives, just yield with context
    if (isPrimitiveNode(node)) {
      const context = createContext(node, parent, index, depth);
      yield { node, context };
      continue;
    }
    
    // Handle arrays - add each item to queue
    if (isArrayNode(node)) {
      for (let i = 0; i < node.length; i++) {
        queue.push({
          node: node[i],
          parent,
          index: i,
          depth
        });
      }
      continue;
    }
    
    // Create context for this component node
    const context = createContext(node, parent, index, depth);
    
    // Yield the node if it matches the filter or if no filter is provided
    if (!nodeTypes || 
        (isComponentNode(node) && nodeTypes.includes(node.type))) {
      yield { node, context };
    }
    
    // Add children to queue
    if (isComponentNode(node) && node.children && !context.shouldSkipChildren) {
      if (isArrayNode(node.children)) {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          queue.push({
            node: child,
            parent: node,
            index: i,
            depth: depth + 1
          });
        }
      } else {
        queue.push({
          node: node.children,
          parent: node,
          index: 0,
          depth: depth + 1
        });
      }
    }
  }
} 