package com.whiteboard.service;

import com.whiteboard.model.Operation;
import com.whiteboard.model.Room;
import com.whiteboard.model.User;
import com.whiteboard.repository.OperationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class OperationService {
    @Autowired
    private OperationRepository operationRepository;

    @Transactional
    public Operation saveOperation(Room room, User user, String operationType, String operationData) {
        Operation lastOp = operationRepository.findTopByRoomOrderBySequenceNumberDesc(room);
        Long nextSequence = (lastOp == null) ? 1L : lastOp.getSequenceNumber() + 1;

        Operation operation = new Operation();
        operation.setRoom(room);
        operation.setUser(user);
        operation.setOperationType(operationType);
        operation.setOperationData(operationData);
        operation.setSequenceNumber(nextSequence);

        return operationRepository.save(operation);
    }

    public List<Operation> getRoomOperations(Room room) {
        return operationRepository.findByRoomOrderBySequenceNumberAsc(room);
    }

    public Operation getLastOperation(Room room) {
        return operationRepository.findTopByRoomOrderBySequenceNumberDesc(room);
    }
}

