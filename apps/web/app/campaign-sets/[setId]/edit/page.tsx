import { Metadata } from "next";
import { EditCampaignSet } from "./EditCampaignSet";

/**
 * Edit Campaign Set Page
 *
 * Server component that renders the edit view for an existing campaign set.
 * The actual data fetching and editing UI is handled by the client component.
 */

interface PageProps {
  params: Promise<{ setId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { setId } = await params;
  return {
    title: `Edit Campaign Set | ${setId}`,
    description: "Edit an existing campaign set configuration",
  };
}

export default async function EditCampaignSetPage({ params }: PageProps) {
  const { setId } = await params;

  return <EditCampaignSet setId={setId} />;
}
