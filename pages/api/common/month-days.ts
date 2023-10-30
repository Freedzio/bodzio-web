import { DayDurations } from "@prisma/client";
import Holidays from "date-holidays";
import { Dayjs } from "dayjs";
import { range } from "lodash";
import { dayjs } from "../../../common/dayjs";
import { workdayHours } from "../../[username]/[month]/[year]";

const getDaysForMonth = (month: string, year: string) => {
	const startDate = dayjs()
		.tz(process.env.TIMEZONE)
		.set("month", parseInt(month))
		.set("year", parseInt(year))
		.startOf("month")
		.add(6, "hours");

	const endDate = dayjs()
		.tz(process.env.TIMEZONE)
		.set("month", parseInt(month))
		.set("year", parseInt(year))
		.endOf("month")
		.subtract(6, "hours");

	const daysRange = Array.from(new Set(range(1, endDate.get("date") + 1)));

	return daysRange.map((n) => startDate.set("date", n));
};

export const isHolidayOrOff = (date: Dayjs) => {
	const hd = new Holidays();
	hd.init("PL");

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

export const getHoursToWorkForDays = (
	days: Dayjs[],
	dayDurations: DayDurations[]
) => {
	return days
		.map((day) => {
			// nie ma ustawionych godzin pracy -> domyślna wartość
			if (dayDurations.length === 0) {
				return workdayHours;
			}

			// znajdź pierwszy ustawiony dzień pracy
			// który jest przed lub tego samego dnia, co ten dzień
			const firstDayDurationBeforeDay = dayDurations.find(
				(dd) =>
					dayjs(dd.fromDate).startOf("day").valueOf() <=
					day.startOf("day").valueOf()
			);

			return firstDayDurationBeforeDay?.duration ?? workdayHours;
		})
		.reduce((prev, curr) => prev + curr, 0);
};
