import { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';

export function useBoardWorkItemModal() {
  const { setSelectedWorkItem } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [modalColumnId, setModalColumnId] = useState<string | null>(null);

  const handleAddItem = useCallback((columnId: string) => {
    setModalColumnId(columnId);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setModalColumnId(null);
    setSelectedWorkItem(null);
  }, [setSelectedWorkItem]);

  return {
    showModal,
    setShowModal,
    modalColumnId,
    setModalColumnId,
    handleAddItem,
    handleCloseModal,
  };
}
