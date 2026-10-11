import { registerAuctionAttendee, type AttendeeRegistrationResponse } from '@/lib/api';

type RegistryEntry = {
  promise?: Promise<AttendeeRegistrationResponse>;
  result?: AttendeeRegistrationResponse;
};

const attendeeRegistry = new Map<string, RegistryEntry>();

export function getAuctionAttendeeRegistrationKey(auctionId: number, userId: number) {
  return `${auctionId}:${userId}`;
}

export function getCachedAuctionAttendeeRegistration(auctionId: number, userId: number) {
  const prefix = `${getAuctionAttendeeRegistrationKey(auctionId, userId)}:`;
  for (const [key, entry] of attendeeRegistry.entries()) {
    if (key.startsWith(prefix) && entry.result) {
      return entry.result;
    }
  }
  return null;
}

export async function ensureAuctionAttendeeRegistration(input: {
  auctionId: number;
  userId: number;
  token: string;
  paymentMethodId: number;
}) {
  const key = `${getAuctionAttendeeRegistrationKey(input.auctionId, input.userId)}:${input.paymentMethodId}`;
  const cached = attendeeRegistry.get(key);

  if (cached?.result) {
    return cached.result;
  }

  if (cached?.promise) {
    return cached.promise;
  }

  const promise = registerAuctionAttendee(input.auctionId, input.token, input.paymentMethodId)
    .then((result) => {
      if (result.attendeeId != null || result.canBid === true || result.accessMode === 'bidder') {
        attendeeRegistry.set(key, { result });
      } else {
        attendeeRegistry.delete(key);
      }
      return result;
    })
    .catch((error) => {
      attendeeRegistry.delete(key);
      throw error;
    });

  attendeeRegistry.set(key, { promise });
  return promise;
}

export function clearAuctionAttendeeRegistration(auctionId: number, userId: number) {
  const prefix = `${getAuctionAttendeeRegistrationKey(auctionId, userId)}:`;
  for (const key of attendeeRegistry.keys()) {
    if (key.startsWith(prefix)) {
      attendeeRegistry.delete(key);
    }
  }
}
