import { buildTree, getDescendants } from './treeHelpers';

/**
 * Generate a recommended project folder structure based on component hierarchy.
 * Layer-based organization: src/pages/ for pages, src/components/ for components.
 * Deck wrappers become folders containing their members.
 */
export function generateFolderStructure(components, decks, options = {}) {
    const {
        includeStyles = true,
        includeIndexFiles = true,
        namingConvention = 'as-is', // 'as-is' or 'kebab-case'
    } = options;

    const deckById = Object.fromEntries(decks.map((d) => [d.id, d]));
    const wrapperDeckById = Object.fromEntries(decks.map((d) => [d.wrapperId, d]));
    const tree = buildTree(components);

    // Build structure recursively
    const structure = {
        type: 'folder',
        name: 'src',
        children: [
            {
                type: 'folder',
                name: 'pages',
                children: [],
            },
            {
                type: 'folder',
                name: 'components',
                children: [],
            },
        ],
    };

    const pagesFolder = structure.children[0];
    const componentsFolder = structure.children[1];

    const processedIds = new Set();

    function toNamingConvention(name) {
        if (namingConvention === 'kebab-case') {
            return name
                .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
                .toLowerCase();
        }
        return name;
    }

    function buildNodeStructure(node, isPage) {
        if (processedIds.has(node.id)) return null;
        processedIds.add(node.id);

        const displayName = toNamingConvention(node.name);
        const isDeck = wrapperDeckById[node.id] != null;

        if (isDeck) {
            // Deck wrapper becomes a folder with its members inside
            const deckMembers = components.filter((c) => c.parentId === node.id && !processedIds.has(c.id));
            const memberChildren = deckMembers
                .map((member) => buildNodeStructure(buildTreeNodeFromComponent(member), isPage))
                .filter(Boolean);

            const folderNode = {
                type: 'folder',
                name: displayName,
                children: memberChildren,
                description: node.description,
            };

            // Add index file if enabled
            if (includeIndexFiles) {
                folderNode.children.push({
                    type: 'file',
                    name: 'index.js',
                    template: generateIndexFile(memberChildren.filter((c) => c.type === 'folder').map((c) => c.name)),
                });
            }

            return folderNode;
        }

        // Regular component/page
        const componentFolder = {
            type: 'folder',
            name: displayName,
            children: [
                {
                    type: 'file',
                    name: `${displayName}.jsx`,
                    template: generateComponentTemplate(node.name, node.type),
                },
            ],
            description: node.description,
        };

        // Add style file if enabled
        if (includeStyles) {
            componentFolder.children.push({
                type: 'file',
                name: `${displayName}.css`,
                template: generateStyleTemplate(displayName),
            });
        }

        // Add children folders
        const children = node.children || [];
        const childFolders = children
            .filter((child) => !processedIds.has(child.id))
            .map((child) => buildNodeStructure(child, isPage))
            .filter(Boolean);

        if (childFolders.length > 0) {
            componentFolder.children.push(...childFolders);
        }

        return componentFolder;
    }

    // Process root and children
    tree.forEach((root) => {
        if (root.id === components.find((c) => c.parentId === null)?.id) {
            // Skip actual root "App" container, process its children
            const rootChildren = root.children || [];
            rootChildren.forEach((child) => {
                const isPage = child.type === 'page';
                const nodeStructure = buildNodeStructure(child, isPage);
                if (nodeStructure) {
                    if (isPage) {
                        pagesFolder.children.push(nodeStructure);
                    } else {
                        componentsFolder.children.push(nodeStructure);
                    }
                }
            });
        }
    });

    return structure;
}

function buildTreeNodeFromComponent(component) {
    return {
        ...component,
        children: [],
    };
}

/**
 * Generate a React component template JSX code.
 */
export function generateComponentTemplate(componentName, type = 'component') {
    const isPascalCase = /^[A-Z]/.test(componentName);
    const name = isPascalCase ? componentName : componentName.charAt(0).toUpperCase() + componentName.slice(1);

    return `import './{{name}}.css';

export default function {{name}}() {
  return (
    <div className="{{kebab-name}}">
      <h2>{{name}}</h2>
      {/* Add your component content here */}
    </div>
  );
}
`
        .replace(/{{name}}/g, name)
        .replace(/{{kebab-name}}/g, name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase());
}

/**
 * Generate a CSS template.
 */
export function generateStyleTemplate(componentName) {
    const kebabName = componentName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    return `.${kebabName} {
  /* Add your styles here */
}
`;
}

/**
 * Generate an index file for barrel exports.
 */
export function generateIndexFile(exportNames) {
    if (!exportNames || exportNames.length === 0) {
        return 'export {};\n';
    }

    const exports = exportNames.map((name) => `export { default as ${toPascalCase(name)} } from './${name}/${name}';`).join('\n');
    return exports + '\n';
}

function toPascalCase(kebabName) {
    return kebabName
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
}

/**
 * Convert structure tree to JSON string for export.
 */
export function structureToJSON(structure, projectName = 'ProjectStructure') {
    return JSON.stringify(
        {
            projectName,
            generatedAt: new Date().toISOString(),
            structure,
        },
        null,
        2,
    );
}

/**
 * Convert structure tree to markdown/text tree visualization.
 */
export function structureToText(structure, indent = 0) {
    let result = '';
    const prefix = '  '.repeat(indent);

    if (structure.type === 'folder') {
        result += `${prefix}📁 ${structure.name}/\n`;
        if (structure.description) {
            result += `${prefix}   └─ ${structure.description}\n`;
        }
        if (structure.children) {
            structure.children.forEach((child) => {
                result += structureToText(child, indent + 1);
            });
        }
    } else if (structure.type === 'file') {
        result += `${prefix}📄 ${structure.name}\n`;
    }

    return result;
}

/**
 * Generate terminal commands to create the folder structure (mkdir/touch style).
 */
export function structureToTerminalCommands(structure, basePath = 'src') {
    const commands = [];
    const createdFolders = new Set();

    function traverse(node, currentPath) {
        const fullPath = `${currentPath}/${node.name}`;

        if (node.type === 'folder') {
            if (!createdFolders.has(fullPath)) {
                commands.push(`mkdir -p "${fullPath}"`);
                createdFolders.add(fullPath);
            }
            if (node.children) {
                node.children.forEach((child) => {
                    traverse(child, fullPath);
                });
            }
        } else if (node.type === 'file') {
            commands.push(`touch "${fullPath}"`);
            // Optionally add a comment for template content
            if (node.template) {
                commands.push(`# Add template content to ${fullPath}`);
            }
        }
    }

    structure.children?.forEach((child) => {
        traverse(child, basePath);
    });

    return commands.join('\n');
}
