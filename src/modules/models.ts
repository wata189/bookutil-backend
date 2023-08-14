import { DocumentData, FirestoreDataConverter } from "firebase/firestore/lite";
import * as firestoreUtil from "./firestoreUtil";

const COLLECTION_PATH = {
  LIBRARY: "/m_library"
};

export const fetchLibraries = async (fs:firestoreUtil.FirestoreTransaction) => {
  const result = await fs.getCollection(COLLECTION_PATH.LIBRARY, "order_num");

  const weekNum = (new Date()).getDay();

  return result.map((resultRow) => {
    const businessHour = resultRow.business_hours.find((hour:any) => hour.day_of_week === weekNum);
    return {
      id: resultRow.id,
      city: resultRow.city,
      name: resultRow.name,
      closestStation: resultRow.closest_station,
      url: resultRow.url,
      mapUrl: resultRow.map_url,
      dayOfWeek: businessHour.day_of_week,
      isOpen: businessHour.is_open,
      startTime: businessHour.start_time,
      endTime: businessHour.end_time
    };
  });
};