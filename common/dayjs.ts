import dayjs from 'dayjs';
// import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import dayOfYear from 'dayjs/plugin/dayOfYear';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import pl from 'dayjs/locale/pl';

dayjs.extend(weekOfYear);
dayjs.extend(dayOfYear);
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.tz.setDefault(process.env.TIMEZONE);

dayjs.locale(pl);

export { dayjs };
