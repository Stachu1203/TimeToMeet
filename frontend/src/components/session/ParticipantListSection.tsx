import type { AvailabilityBlock, User } from "../../types";
import { CheckIcon, TrashIcon } from "../Icons";
import { formatBlockTimeRange } from "./sessionUtils";

interface ParticipantListSectionProps {
  participants: User[];
  highlightedUserId: string | null;
  userBlocksMap: Record<string, AvailabilityBlock[]>;
  assignedColors: Map<string, string>;
  isCreator: boolean;
  creatorId: string | null | undefined;
  currentUser: User | null;
  saving: boolean;
  onSelectHighlightedUser: (userId: string | null) => void;
  onRemoveParticipant: (userId: string) => void;
  onRemoveTimeWindow: (availabilityId: string) => void;
}

export function ParticipantListSection({
  participants,
  highlightedUserId,
  userBlocksMap,
  assignedColors,
  isCreator,
  creatorId,
  currentUser,
  saving,
  onSelectHighlightedUser,
  onRemoveParticipant,
  onRemoveTimeWindow,
}: ParticipantListSectionProps) {
  const highlightedUser = participants.find((p) => p.id === highlightedUserId);
  const highlightedUserBlocks = highlightedUserId
    ? (userBlocksMap[highlightedUserId] ?? [])
    : [];

  return (
    <div className="pt-6 border-t border-white/15 space-y-4 text-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold text-white">
          List of all participants{" "}
          {highlightedUser ? (
            <span className="text-base font-normal text-white">
              (Highlighting {highlightedUser.name})
            </span>
          ) : (
            <span className="text-base font-normal text-white">
              (Click on a user to highlight)
            </span>
          )}
        </h2>
        {highlightedUserId && (
          <button
            type="button"
            onClick={() => onSelectHighlightedUser(null)}
            className="px-3 py-1 text-xs font-semibold bg-white text-black rounded-md cursor-pointer"
          >
            Show All Group Overlap
          </button>
        )}
      </div>

      <ul className="flex flex-wrap gap-2">
        {participants.map((participant) => {
          const isHighlighted = highlightedUserId === participant.id;
          const hasAvailabilities =
            (userBlocksMap[participant.id]?.length ?? 0) > 0;
          return (
            <li
              key={participant.id}
              className="inline-flex items-center gap-1"
            >
              <button
                type="button"
                onClick={() =>
                  onSelectHighlightedUser(
                    isHighlighted ? null : participant.id,
                  )
                }
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-base font-medium text-white transition-transform active:scale-95 cursor-pointer ${
                  isHighlighted ? "ring-2 ring-white" : ""
                }`}
                style={{
                  backgroundColor: assignedColors.get(participant.id),
                }}
              >
                <CheckIcon />
                <span>{participant.name}</span>
              </button>
              {isCreator &&
                hasAvailabilities &&
                participant.id !== creatorId && (
                  <button
                    type="button"
                    disabled={saving}
                    title={`Remove ${participant.name} from poll`}
                    onClick={() => onRemoveParticipant(participant.id)}
                    className="p-2 rounded-md bg-[#181a20] hover:bg-white/10 border border-white/20 text-white cursor-pointer"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
            </li>
          );
        })}
      </ul>

      {highlightedUser && highlightedUserBlocks.length > 0 && (
        <div className="p-4 rounded-md bg-[#181a20] border border-white/20 space-y-3">
          <div className="text-sm font-semibold uppercase tracking-wider text-white">
            {highlightedUser.name}&apos;s Time Windows
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {highlightedUserBlocks.map((block) => {
              const canDeleteWindow =
                isCreator || (currentUser && currentUser.id === block.user_id);
              return (
                <div
                  key={block.id}
                  className="px-3.5 py-2.5 rounded-md bg-[#121318] border border-white/15 flex items-center justify-between gap-2"
                >
                  <span className="text-xs font-mono text-white">
                    {formatBlockTimeRange(block.start_time, block.end_time)}
                  </span>
                  {canDeleteWindow && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onRemoveTimeWindow(block.id)}
                      className="p-1.5 rounded-md bg-[#181a20] hover:bg-white/10 border border-white/20 text-white cursor-pointer"
                      title="Remove time window"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
