import React from "react";
import { useBuilder } from "@/contexts/BuilderContext";

interface EditableElementProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function EditableElement({ id, children, className = "", as: Component = "div" }: EditableElementProps) {
  const { isEditMode, selectedElement, setSelectedElement, uiConfigs } = useBuilder();
  const config = uiConfigs[id] || {};

  const handleClick = (e: React.MouseEvent) => {
    if (isEditMode) {
      e.preventDefault();
      e.stopPropagation();
      setSelectedElement(id);
    }
  };

  const isSelected = selectedElement === id;

  const style: React.CSSProperties = {
    color: config.color,
    fontSize: config.fontSize ? `${config.fontSize}px` : undefined,
    borderRadius: config.borderRadius ? `${config.borderRadius}px` : undefined,
    backgroundImage: config.imageUrl ? `url(${config.imageUrl})` : undefined,
    outline: isSelected ? "2px solid #C5A46D" : isEditMode ? "1px dashed #ccc" : "none",
    cursor: isEditMode ? "pointer" : "inherit",
    position: "relative",
    ...(config.imageUrl ? { backgroundSize: 'cover', backgroundPosition: 'center' } : {})
  };

  return (
    <Component 
      id={id}
      className={`${className} ${isEditMode ? "hover:outline hover:outline-accent/50" : ""}`}
      style={style}
      onClick={handleClick}
    >
      {config.text || children}
    </Component>
  );
}
