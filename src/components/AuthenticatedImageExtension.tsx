"use client";

import Image from "@tiptap/extension-image";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { AuthenticatedImage } from "./AuthenticatedImage";

function ImageNodeView({ node }: ReactNodeViewProps) {
  const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
  const alt = typeof node.attrs.alt === "string" ? node.attrs.alt : "";
  return (
    <NodeViewWrapper className="authenticated-image-node">
      <AuthenticatedImage src={src} alt={alt} />
    </NodeViewWrapper>
  );
}

export const AuthenticatedImageExtension = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});