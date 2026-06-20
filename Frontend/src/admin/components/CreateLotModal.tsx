import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { X } from 'lucide-react';
import api from '../../services/api';

interface CreateLotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateLotModal({ isOpen, onClose, onSuccess }: CreateLotModalProps) {
  const [lotName, setLotName] = useState('');
  const [address, setAddress] = useState('');
  const [totalFloors, setTotalFloors] = useState('');
  const [slotsPerFloor, setSlotsPerFloor] = useState('');
  const [pricePerHour, setPricePerHour] = useState('50');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!lotName || !address || !totalFloors || !slotsPerFloor || !pricePerHour || !image) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('lotName', lotName);
      formData.append('address', address);
      formData.append('totalFloors', totalFloors);
      formData.append('slotsPerFloor', slotsPerFloor);
      formData.append('pricePerHour', pricePerHour);
      formData.append('parkingLotImg', image);

      await api.post('/parking-lots/create-parking-lot', formData);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      const axiosMsg = err.message;
      const status = err.response?.status ? ` (${err.response.status})` : '';
      
      if (serverMsg) {
        setError(`${serverMsg}${status}`);
      } else {
        setError(`${axiosMsg}${status}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-5">
                  <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900">
                    Add Parking Lot
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-500 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 border border-red-200">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lot Name</label>
                    <input
                      type="text"
                      value={lotName}
                      onChange={(e) => setLotName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                      placeholder="e.g. Central Mall Parking"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                      placeholder="e.g. 123 Main St"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Floors</label>
                      <input
                        type="number"
                        min="1"
                        value={totalFloors}
                        onChange={(e) => setTotalFloors(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                        placeholder="e.g. 3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Slots per Floor</label>
                      <input
                        type="number"
                        min="1"
                        value={slotsPerFloor}
                        onChange={(e) => setSlotsPerFloor(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                        placeholder="e.g. 50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price per Hour (₹)</label>
                    <input
                      type="number"
                      min="1"
                      value={pricePerHour}
                      onChange={(e) => setPricePerHour(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                      placeholder="e.g. 50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Parking Lot Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImage(e.target.files?.[0] || null)}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-900 hover:file:bg-gray-200"
                    />
                  </div>

                  <div className="mt-8 flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? 'Creating...' : 'Create Lot'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
