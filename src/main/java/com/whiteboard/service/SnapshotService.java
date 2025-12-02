package com.whiteboard.service;

import com.whiteboard.model.Room;
import com.whiteboard.model.Snapshot;
import com.whiteboard.repository.SnapshotRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SnapshotService {
    @Autowired
    private SnapshotRepository snapshotRepository;

    @Autowired
    private RoomService roomService;

    public Snapshot saveSnapshot(Room room, String imageData) {
        Snapshot snapshot = new Snapshot();
        snapshot.setRoom(room);
        snapshot.setImageData(imageData);
        return snapshotRepository.save(snapshot);
    }

    public Optional<Snapshot> getLatestSnapshot(Room room) {
        return snapshotRepository.findTopByRoomOrderByCreatedAtDesc(room);
    }

    public List<Snapshot> getRoomSnapshots(Room room) {
        return snapshotRepository.findByRoomOrderByCreatedAtDesc(room);
    }

    @Scheduled(fixedRate = 300000)
    public void periodicSnapshot() {
        List<com.whiteboard.model.Room> rooms = roomService.findAllRooms();
        for (com.whiteboard.model.Room room : rooms) {
            if (room.getLastUpdated() != null) {
                long minutesSinceUpdate = java.time.Duration.between(
                    room.getLastUpdated(), java.time.LocalDateTime.now()).toMinutes();
                if (minutesSinceUpdate > 5) {
                    saveSnapshot(room, "");
                }
            }
        }
    }
}

