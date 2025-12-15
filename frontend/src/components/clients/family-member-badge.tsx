"use client";

import { Badge } from "@/components/ui/badge";
import type { FamilyCircleMember } from "@/types/client";

interface FamilyMemberBadgeProps {
  member: FamilyCircleMember;
  hideRelationship?: boolean;
}

const relationshipTypeLabels: Record<string, string> = {
  spouse: "Cónyuge",
  child: "Hijo/a",
  parent: "Padre/Madre",
  sibling: "Hermano/a",
  friend: "Amigo/a",
  other: "Otro",
};

export function FamilyMemberBadge({
  member,
  hideRelationship = false,
}: FamilyMemberBadgeProps) {
  const relationshipLabel = relationshipTypeLabels[member.relationshipType];

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <p className="font-medium text-sm">{member.memberName || member.memberId}</p>
        {member.memberEmail && (
          <p className="text-xs text-slate-600">{member.memberEmail}</p>
        )}
      </div>
      {!hideRelationship && (
        <Badge variant="outline">{relationshipLabel}</Badge>
      )}
    </div>
  );
}
