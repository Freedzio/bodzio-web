import Holidays from 'date-holidays';
import { Dayjs } from 'dayjs';
import { range } from 'lodash';
import { dayjs } from '../../../common/dayjs';

const getDaysForMonth = (month: string, year: string) => {
	const startDate = dayjs()
		.tz(process.env.TIMEZONE)
		.set('month', parseInt(month))
		.set('year', parseInt(year))
		.startOf('month');

	const endDate = dayjs()
		.tz(process.env.TIMEZONE)
		.set('month', parseInt(month))
		.set('year', parseInt(year))
		.endOf('month');

	const daysRange = range(1, endDate.get('date') + 1);

	return daysRange.map((n) => startDate.set('date', n));
};

export const isHolidayOrOff = (date: Dayjs) => {
	const hd = new Holidays();
	hd.init('PL');

	return (
		!!hd.isHoliday(date.toString()) || date.day() === 0 || date.day() === 6
	);
};

const isWorkingDay = (date: Dayjs) => !isHolidayOrOff(date);

export const getWorkingDaysForMonth = (month: string, year: string) => {
	return getDaysForMonth(month, year).filter(isWorkingDay);
};

export const getOffDaysForMonth = (month: string, year: string) => {
	return getDaysForMonth(month, year).filter(isHolidayOrOff);
};
