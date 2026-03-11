import { getHomeKnowledgeGraph } from "../lib/content";
import { KnowledgeGraphView } from "./KnowledgeGraphView";

export async function HomeKnowledgeGraph({
  visibility,
  title,
  description
}: {
  visibility: "all" | "public";
  title: string;
  description: string;
}) {
  const graph = await getHomeKnowledgeGraph({ visibility });

  if (graph.nodes.length === 0) {
    return null;
  }

  return (
    <KnowledgeGraphView 
      graph={graph} 
      title={title} 
      description={description} 
    />
  );
}
