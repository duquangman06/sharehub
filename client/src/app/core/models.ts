export interface User { _id: string; name: string; email?: string; phone?: string; avatar?: string; bio?: string; role?: 'user' | 'admin';
  accountStatus?: string; kycReview?: any; walletBalance?: number; kycStatus: 'none' | 'pending' | 'verified' | 'rejected'; ratingAvg: number; ratingCount: number; trustScore: number; avgResponseMinutes?: number; completedCount?: number; }
export interface Asset { bookingEligibility?: {allowed:boolean;message?:string}; _id: string; title: string; category: string; description: string; images: string[]; condition: number; accessories: string[];
  pricePerHour: number; pricePerDay: number; deposit: number; bufferHours: number; purchasePrice: number; delivery: string;
  location?: { lat: number; lng: number; address: string }; status: string; ratingAvg: number; ratingCount: number; owner: any; distance?: number | null; }
export interface Category { _id: string; name: string; slug: string; icon: string; }
export interface Booking { _id: string; asset: any; renter: any; owner: any; startDate: string; endDate: string; days: number; rentalFee: number; deposit: number;
  discount: number; total: number; status: string; paymentStatus: string; handoverAddress?: string; pickupToken?: string; returnToken?: string;
  checkinPhotos: string[]; checkoutPhotos: string[]; myRole?: string; reviewedByRenter: boolean; reviewedByOwner: boolean; rejectReason?: string; dispute?: any; createdAt: string; }
