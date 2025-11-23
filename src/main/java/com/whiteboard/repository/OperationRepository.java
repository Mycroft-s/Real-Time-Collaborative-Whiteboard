package com.whiteboard.repository;

import com.whiteboard.model.Operation;
import com.whiteboard.model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OperationRepository extends JpaRepository<Operation, Long> {
    List<Operation> findByRoomOrderBySequenceNumberAsc(Room room);
    Operation findTopByRoomOrderBySequenceNumberDesc(Room room);
}

