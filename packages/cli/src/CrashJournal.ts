import { existsSync } from 'fs';
import { mkdir, utimes, open, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { UserSettings } from 'n8n-core';
import { ErrorReporterProxy as ErrorReporter, LoggerProxy, sleep } from 'n8n-workflow';

export const touchFile = async (filePath: string): Promise<void> => {
	await mkdir(dirname(filePath), { recursive: true });
	const time = new Date();
	try {
		await utimes(filePath, time, time);
	} catch {
		const fd = await open(filePath, 'w');
		await fd.close();
	}
};

const journalFile = join(UserSettings.getUserN8nFolderPath(), 'crash.journal');

export const init = async () => {
	if (existsSync(journalFile)) {
		// Crash detected
		ErrorReporter.warn('Last session crashed');
		LoggerProxy.error('Last session crashed');
		// add a 10 seconds pause to slow down crash-looping
		await sleep(10_000);
	}
	await touchFile(journalFile);
};

export const cleanup = async () => {
	await rm(journalFile, { force: true });
};
