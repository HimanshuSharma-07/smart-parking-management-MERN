import { useEffect, useState } from "react";
import { Plus, Edit2, Image as ImageIcon, Trash2, Layers } from "lucide-react";
import api from "../../services/api";
import CreateLotModal from "../components/CreateLotModal";
import EditLotModal from "../components/EditLotModal";
import EditLotImageModal from "../components/EditLotImageModal";
import CreateSlotsModal from "../components/CreateSlotsModal";
import ConfirmDialog from "../../components/ConfirmDialog";

const AdminParkingLots = () => {
  const [lots, setLots] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isSlotsModalOpen, setIsSlotsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<any>(null);

  const fetchLots = () => {
    api.get("/parking-lots/all-parking-lots")
      .then((res) => {
        setLots(res.data.data);
      })
      .catch((err) => console.error("Failed to fetch parking lots", err));
  };

  useEffect(() => {
    fetchLots();
  }, []);

  const handleDelete = async () => {
    if (!selectedLot) return;
    try {
      await api.delete(`/parking-lots/delete-parking-lot/${selectedLot._id}`);
      fetchLots();
      setIsDeleteConfirmOpen(false);
      setSelectedLot(null);
    } catch (err) {
      console.error("Failed to delete parking lot", err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parking Lots</h1>
          <p className="text-gray-500 mt-1">Manage parking locations and slot configurations</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 cursor-pointer bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Parking Lot
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200 text-gray-500">
                <th className="px-6 py-4 font-semibold">Lot Name</th>
                <th className="px-6 py-4 font-semibold">Address</th>
                <th className="px-6 py-4 font-semibold text-center">Total Slots</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lots.map((lot) => (
                <tr key={lot._id} className="hover:bg-gray-50/50 transition-colors text-gray-800">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{lot.lotName}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{lot.address}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {lot.totalSlots} slots
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedLot(lot);
                          setIsSlotsModalOpen(true);
                        }}
                        title="Bulk Add Slots"
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Layers className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLot(lot);
                          setIsImageModalOpen(true);
                        }}
                        title="Update Image"
                        className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLot(lot);
                          setIsEditModalOpen(true);
                        }}
                        title="Edit Details"
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLot(lot);
                          setIsDeleteConfirmOpen(true);
                        }}
                        title="Delete Lot"
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {lots.length === 0 && (
            <div className="text-center py-12 text-gray-500 italic">No parking lots found.</div>
          )}
        </div>
      </div>

      <CreateLotModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={fetchLots} 
      />

      <EditLotModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedLot(null);
        }}
        onSuccess={fetchLots}
        lot={selectedLot}
      />

      <EditLotImageModal
        isOpen={isImageModalOpen}
        onClose={() => {
          setIsImageModalOpen(false);
          setSelectedLot(null);
        }}
        onSuccess={fetchLots}
        lot={selectedLot}
      />

      <CreateSlotsModal
        isOpen={isSlotsModalOpen}
        onClose={() => {
          setIsSlotsModalOpen(false);
          setSelectedLot(null);
        }}
        onSuccess={fetchLots}
        lotId={selectedLot?._id || ""}
        lotName={selectedLot?.lotName || ""}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setSelectedLot(null);
        }}
        onConfirm={handleDelete}
        title="Delete Parking Lot"
        message={`Are you sure you want to delete "${selectedLot?.lotName}"? This action cannot be undone and will delete all associated slots and bookings.`}
        confirmLabel="Delete"
        isDestructive={true}
      />
    </div>
  );
};

export default AdminParkingLots;
