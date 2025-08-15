class LayoutEngine {
  constructor() {
    this.containers = new Map();
  }

  createContainer(id, options = {}) {
    const container = {
      id,
      type: options.type || 'flex',
      x: options.x || 0,
      y: options.y || 0,
      width: options.width || 80,
      height: options.height || 24,
      padding: options.padding || 0,
      margin: options.margin || 0,
      direction: options.direction || 'column',
      justify: options.justify || 'start',
      align: options.align || 'start',
      wrap: options.wrap || false,
      gap: options.gap || 0,
      children: [],
      computed: {
        contentX: 0,
        contentY: 0,
        contentWidth: 0,
        contentHeight: 0
      }
    };

    this.containers.set(id, container);
    this.computeLayout(container);
    return container;
  }

  addChild(containerId, child, options = {}) {
    const container = this.containers.get(containerId);
    if (!container) return null;

    const childItem = {
      component: child,
      flex: options.flex || 0,
      basis: options.basis || 'auto',
      grow: options.grow || 0,
      shrink: options.shrink || 1,
      align: options.align || 'auto',
      margin: options.margin || 0,
      computed: {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      }
    };

    container.children.push(childItem);
    this.computeLayout(container);
    return childItem;
  }

  computeLayout(container) {
    this.computeContentArea(container);
    
    switch (container.type) {
      case 'flex':
        this.computeFlexLayout(container);
        break;
      case 'grid':
        this.computeGridLayout(container);
        break;
      case 'absolute':
        this.computeAbsoluteLayout(container);
        break;
      default:
        this.computeFlexLayout(container);
    }
  }

  computeContentArea(container) {
    container.computed.contentX = container.x + container.padding;
    container.computed.contentY = container.y + container.padding;
    container.computed.contentWidth = container.width - (container.padding * 2);
    container.computed.contentHeight = container.height - (container.padding * 2);
  }

  computeFlexLayout(container) {
    const { children, direction, computed } = container;
    const { contentX, contentY, contentWidth, contentHeight } = computed;
    
    if (children.length === 0) return;

    const isRow = direction === 'row' || direction === 'row-reverse';
    const isReverse = direction.includes('reverse');
    
    const mainSize = isRow ? contentWidth : contentHeight;
    const crossSize = isRow ? contentHeight : contentWidth;
    
    const totalGap = container.gap * (children.length - 1);
    const availableMainSize = mainSize - totalGap;
    
    let totalFlexGrow = 0;
    let totalBasisSize = 0;
    
    children.forEach(child => {
      totalFlexGrow += child.grow;
      if (typeof child.basis === 'number') {
        totalBasisSize += child.basis;
      } else if (child.component && child.component.width !== undefined) {
        totalBasisSize += isRow ? child.component.width : child.component.height;
      }
    });
    
    const remainingSpace = Math.max(0, availableMainSize - totalBasisSize);
    const flexUnit = totalFlexGrow > 0 ? remainingSpace / totalFlexGrow : 0;
    
    let currentPos = isReverse ? mainSize : 0;
    
    children.forEach((child, index) => {
      let childMainSize;
      
      if (typeof child.basis === 'number') {
        childMainSize = child.basis;
      } else if (child.component && child.component.width !== undefined) {
        childMainSize = isRow ? child.component.width : child.component.height;
      } else {
        childMainSize = Math.floor(availableMainSize / children.length);
      }
      
      childMainSize += child.grow * flexUnit;
      
      const childCrossSize = this.computeChildCrossSize(child, crossSize);
      
      if (isRow) {
        child.computed.width = Math.floor(childMainSize);
        child.computed.height = childCrossSize;
        
        if (isReverse) {
          currentPos -= child.computed.width;
          child.computed.x = contentX + currentPos;
          currentPos -= container.gap;
        } else {
          child.computed.x = contentX + currentPos;
          currentPos += child.computed.width + container.gap;
        }
        
        child.computed.y = contentY + this.computeChildCrossAlign(child, container, contentHeight, childCrossSize);
      } else {
        child.computed.width = childCrossSize;
        child.computed.height = Math.floor(childMainSize);
        
        if (isReverse) {
          currentPos -= child.computed.height;
          child.computed.y = contentY + currentPos;
          currentPos -= container.gap;
        } else {
          child.computed.y = contentY + currentPos;
          currentPos += child.computed.height + container.gap;
        }
        
        child.computed.x = contentX + this.computeChildCrossAlign(child, container, contentWidth, childCrossSize);
      }
      
      if (child.component && child.component.setPosition) {
        child.component.setPosition(child.computed.x, child.computed.y);
      }
      if (child.component && child.component.setSize) {
        child.component.setSize(child.computed.width, child.computed.height);
      }
    });
  }

  computeChildCrossSize(child, crossSize) {
    if (child.component && child.component.height !== undefined) {
      return child.component.height;
    }
    return crossSize;
  }

  computeChildCrossAlign(child, container, containerCrossSize, childCrossSize) {
    const align = child.align !== 'auto' ? child.align : container.align;
    
    switch (align) {
      case 'start':
        return 0;
      case 'center':
        return Math.floor((containerCrossSize - childCrossSize) / 2);
      case 'end':
        return containerCrossSize - childCrossSize;
      case 'stretch':
        return 0;
      default:
        return 0;
    }
  }

  computeGridLayout(container) {
    // Grid layout implementation would go here
    // For now, fall back to flex
    this.computeFlexLayout(container);
  }

  computeAbsoluteLayout(container) {
    const { children, computed } = container;
    const { contentX, contentY } = computed;
    
    children.forEach(child => {
      if (child.component) {
        child.computed.x = contentX + (child.x || 0);
        child.computed.y = contentY + (child.y || 0);
        child.computed.width = child.width || child.component.width || 10;
        child.computed.height = child.height || child.component.height || 1;
        
        if (child.component.setPosition) {
          child.component.setPosition(child.computed.x, child.computed.y);
        }
        if (child.component.setSize) {
          child.component.setSize(child.computed.width, child.computed.height);
        }
      }
    });
  }

  getContainer(id) {
    return this.containers.get(id);
  }

  removeContainer(id) {
    return this.containers.delete(id);
  }

  updateContainer(id, options) {
    const container = this.containers.get(id);
    if (!container) return null;
    
    Object.assign(container, options);
    this.computeLayout(container);
    return container;
  }

  renderContainer(id) {
    const container = this.containers.get(id);
    if (!container) return [];
    
    const buffer = [];
    const maxY = container.y + container.height;
    
    for (let y = container.y; y < maxY; y++) {
      buffer.push(' '.repeat(container.width));
    }
    
    container.children.forEach(child => {
      if (child.component && child.component.render) {
        const childLines = child.component.render();
        const startY = child.computed.y - container.y;
        const startX = child.computed.x - container.x;
        
        childLines.forEach((line, lineIndex) => {
          const targetY = startY + lineIndex;
          if (targetY >= 0 && targetY < buffer.length) {
            const existingLine = buffer[targetY];
            const beforeContent = existingLine.substring(0, startX);
            const afterContent = existingLine.substring(startX + line.length);
            buffer[targetY] = beforeContent + line + afterContent;
          }
        });
      }
    });
    
    return buffer;
  }
}

module.exports = LayoutEngine;