import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import pl from 'dayjs/locale/pl';

dayjs.extend(isoWeek);
dayjs.extend(customParseFormat);
dayjs.locale(pl);

export { dayjs };
