import AudioRoomModel from "../../models/audio_room/audio_room_model";

/**
 * Deactivate and clear presence on all audio rooms at server startup.
 *
 * When the process restarts (deploy, crash, reload), every socket connection is
 * gone, so NO room can still be genuinely "live". But rooms that were active at
 * that moment keep `isActive: true` in the DB — their leave/disconnect handlers
 * never ran — so they show as "active" forever in the room list.
 *
 * This resets that orphaned state (flags + host/member/seat presence) so only
 * rooms whose host actually reconnects and goes live again appear as active.
 * It does not delete rooms — a host's room config (title, seat count, etc.) is
 * preserved and simply reactivated next time they go live.
 */
export async function resetStaleAudioRoomsOnStartup(): Promise<void> {
  // Only touch rooms that still look "present" from the previous run.
  const rooms = await AudioRoomModel.find({
    $or: [
      { isActive: true },
      { isHostPresent: true },
      { "membersArray.0": { $exists: true } },
    ],
  });

  if (rooms.length === 0) return;

  for (const room of rooms) {
    room.isActive = false;
    room.isHostPresent = false;
    room.members = new Map();
    room.membersArray = [];
    room.hostSeat = { available: true, isMute: false };

    // Free every numbered seat (drop any stale occupant).
    for (const key of Array.from(room.seats.keys())) {
      room.seats.set(key, { available: true, isMute: false });
    }

    await room.save();
  }

  console.log(`♻️  Reset ${rooms.length} stale audio room(s) on startup`);
}
