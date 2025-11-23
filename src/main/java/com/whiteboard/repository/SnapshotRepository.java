package com.whiteboard.repository;

import com.whiteboard.model.Room;
import com.whiteboard.model.Snapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SnapshotRepository extends JpaRepository<Snapshot, Long> {
    List<Snapshot> findByRoomOrderByCreatedAtDesc(Room room);
    Optional<Snapshot> findTopByRoomOrderByCreatedAtDesc(Room room);
}

