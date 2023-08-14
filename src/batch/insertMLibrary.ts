
import * as firestoreUtil from "../modules/firestoreUtil";
import mLibraries from './dbdata/bookutil.m_library.json';
import mLibraryBusinessHours from './dbdata/bookutil.m_library_business_hours.json';

console.log("start insertMLibrary")

const at = (new Date());
const insertData = mLibraries.map((library:any) => {
  const businessHours = mLibraryBusinessHours.filter((hour:any)=> {return library.id === hour.library_id})
    .map((hour:any)=>{
      return {
        day_of_week: hour.day_of_week,
        is_open: hour.is_open,
        start_time: hour.start_time,
        end_time: hour.end_time
      }
    });
  console.log(businessHours)
  return {
    id: library.id,
    city: library.city,
    name: library.name,
    closest_station: library.closest_station,
    url: library.url,
    map_url: library.url,
    order_num: library.order_num,
    new_book_check_flg: library.new_book_check_flg,
    create_user: "batch",
    create_at: at,
    update_user: "batch",
    update_at: at,
    business_hours: businessHours
  }
});
firestoreUtil.tran([
  //TODO:insert
]);
console.log("end insertMLibrary")