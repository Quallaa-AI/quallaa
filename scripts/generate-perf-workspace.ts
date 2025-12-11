/********************************************************************************
 * Copyright (C) 2025 Jeff Toffoli
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
 ********************************************************************************/

/**
 * Generate a large test workspace for performance testing
 * Creates 1000+ markdown notes with realistic content, wiki links, and tags
 */

import * as fs from 'fs';
import * as path from 'path';

interface GeneratorConfig {
    outputDir: string;
    noteCount: number;
    avgLinksPerNote: number;
    tagCategories: string[];
    noteSizes: { short: number; medium: number; long: number };
}

const DEFAULT_CONFIG: GeneratorConfig = {
    outputDir: 'perf-workspace',
    noteCount: 1000,
    avgLinksPerNote: 5,
    tagCategories: ['project', 'research', 'meeting', 'idea', 'reference', 'todo', 'archive'],
    noteSizes: {
        short: 0.3, // 30% short notes (100-300 words)
        medium: 0.5, // 50% medium notes (300-800 words)
        long: 0.2, // 20% long notes (800-2000 words)
    },
};

// Sample content templates
const NOTE_TOPICS = [
    'Software Development',
    'Machine Learning',
    'Web Design',
    'Database Architecture',
    'API Design',
    'User Experience',
    'Performance Optimization',
    'Security Best Practices',
    'Testing Strategies',
    'Agile Methodologies',
    'Cloud Computing',
    'DevOps Practices',
    'Data Science',
    'Mobile Development',
    'Blockchain Technology',
];

const PARAGRAPH_TEMPLATES = [
    'This approach focuses on {{topic}} and aims to improve {{aspect}}. The main benefit is {{benefit}}.',
    "When implementing {{topic}}, it's important to consider {{aspect}}. This helps ensure {{benefit}}.",
    'Research shows that {{topic}} can significantly impact {{aspect}}, leading to {{benefit}}.',
    'The key to effective {{topic}} lies in understanding {{aspect}} and optimizing for {{benefit}}.',
    'Modern {{topic}} practices emphasize {{aspect}} to achieve {{benefit}}.',
    'By focusing on {{topic}}, teams can enhance {{aspect}} and deliver {{benefit}}.',
];

const ASPECTS = [
    'scalability',
    'maintainability',
    'performance',
    'user experience',
    'code quality',
    'team collaboration',
    'security',
    'reliability',
    'accessibility',
    'developer productivity',
];

const BENEFITS = [
    'faster development cycles',
    'better user satisfaction',
    'reduced technical debt',
    'improved system reliability',
    'enhanced team efficiency',
    'lower maintenance costs',
    'increased code reusability',
    'better error handling',
    'clearer documentation',
    'stronger security posture',
];

function randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateParagraph(): string {
    const template = randomChoice(PARAGRAPH_TEMPLATES);
    return template.replace('{{topic}}', randomChoice(NOTE_TOPICS)).replace('{{aspect}}', randomChoice(ASPECTS)).replace('{{benefit}}', randomChoice(BENEFITS));
}

function generateContent(wordCount: number): string {
    const paragraphs: string[] = [];
    let currentWords = 0;

    while (currentWords < wordCount) {
        const para = generateParagraph();
        paragraphs.push(para);
        currentWords += para.split(' ').length;
    }

    return paragraphs.join('\n\n');
}

function determineNoteSize(config: GeneratorConfig): 'short' | 'medium' | 'long' {
    const rand = Math.random();
    if (rand < config.noteSizes.short) {
        return 'short';
    }
    if (rand < config.noteSizes.short + config.noteSizes.medium) {
        return 'medium';
    }
    return 'long';
}

function getWordCount(size: 'short' | 'medium' | 'long'): number {
    switch (size) {
        case 'short':
            return randomInt(100, 300);
        case 'medium':
            return randomInt(300, 800);
        case 'long':
            return randomInt(800, 2000);
    }
}

function generateNoteName(index: number, topic: string): string {
    const prefixes = ['Understanding', 'Exploring', 'Deep Dive into', 'Introduction to', 'Guide to', 'Notes on'];
    const prefix = randomChoice(prefixes);
    return `${prefix} ${topic} ${index}`;
}

function generateTags(config: GeneratorConfig): string[] {
    const tagCount = randomInt(1, 4);
    const tags: string[] = [];

    for (let i = 0; i < tagCount; i++) {
        const category = randomChoice(config.tagCategories);
        const subcategory = randomChoice(['backend', 'frontend', 'database', 'devops', 'testing']);
        tags.push(Math.random() > 0.5 ? category : `${category}/${subcategory}`);
    }

    return [...new Set(tags)]; // Remove duplicates
}

function generateWikiLinks(noteIndex: number, totalNotes: number, avgLinks: number): string[] {
    const linkCount = Math.max(1, Math.round(avgLinks + (Math.random() - 0.5) * 4));
    const links: Set<number> = new Set();

    while (links.size < Math.min(linkCount, totalNotes - 1)) {
        const targetIndex = randomInt(0, totalNotes - 1);
        if (targetIndex !== noteIndex) {
            links.add(targetIndex);
        }
    }

    return Array.from(links).map(i => `Note ${i + 1}`);
}

function generateFrontmatter(title: string, tags: string[]): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `---
title: ${title}
date: ${year}-${month}-${day}
tags:
${tags.map(t => `  - ${t}`).join('\n')}
---

`;
}

function generateNote(index: number, totalNotes: number, config: GeneratorConfig): string {
    const topic = randomChoice(NOTE_TOPICS);
    const title = generateNoteName(index + 1, topic);
    const tags = generateTags(config);
    const size = determineNoteSize(config);
    const wordCount = getWordCount(size);

    // Generate frontmatter
    let content = generateFrontmatter(title, tags);

    // Add title
    content += `# ${title}\n\n`;

    // Add overview
    content += '## Overview\n\n';
    content += generateContent(Math.floor(wordCount * 0.3)) + '\n\n';

    // Add wiki links section
    const wikiLinks = generateWikiLinks(index, totalNotes, config.avgLinksPerNote);
    if (wikiLinks.length > 0) {
        content += '## Related Notes\n\n';
        wikiLinks.forEach(link => {
            content += `- [[${link}]]\n`;
        });
        content += '\n';
    }

    // Add key points
    content += '## Key Points\n\n';
    const keyPointCount = randomInt(3, 6);
    for (let i = 0; i < keyPointCount; i++) {
        content += `- ${generateParagraph()}\n`;
    }
    content += '\n';

    // Add details
    content += '## Details\n\n';
    content += generateContent(Math.floor(wordCount * 0.5)) + '\n\n';

    // Add references with some wiki links
    if (Math.random() > 0.5) {
        content += '## References\n\n';
        const refCount = randomInt(2, 4);
        for (let i = 0; i < refCount; i++) {
            if (Math.random() > 0.5 && wikiLinks.length > i) {
                content += `- See [[${wikiLinks[i]}]] for more details\n`;
            } else {
                content += `- ${randomChoice(NOTE_TOPICS)} documentation\n`;
            }
        }
        content += '\n';
    }

    return content;
}

function createWorkspace(config: GeneratorConfig): void {
    console.log('Generating performance test workspace...');
    console.log(`- Output: ${config.outputDir}`);
    console.log(`- Notes: ${config.noteCount}`);
    console.log(`- Avg links/note: ${config.avgLinksPerNote}`);

    // Create output directory
    if (fs.existsSync(config.outputDir)) {
        console.log(`\n⚠️  Directory ${config.outputDir} already exists.`);
        console.log('   Deleting and recreating...');
        fs.rmSync(config.outputDir, { recursive: true, force: true });
    }

    fs.mkdirSync(config.outputDir, { recursive: true });

    // Generate notes
    console.log('\nGenerating notes...');
    const startTime = Date.now();

    for (let i = 0; i < config.noteCount; i++) {
        const noteContent = generateNote(i, config.noteCount, config);
        const filename = `Note ${i + 1}.md`;
        const filepath = path.join(config.outputDir, filename);

        fs.writeFileSync(filepath, noteContent, 'utf-8');

        // Progress indicator
        if ((i + 1) % 100 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`  Generated ${i + 1}/${config.noteCount} notes (${elapsed}s)`);
        }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n✅ Workspace generated successfully!');
    console.log(`   Total time: ${totalTime}s`);
    console.log(`   Location: ${path.resolve(config.outputDir)}`);
}

// CLI interface
function main(): void {
    const args = process.argv.slice(2);
    const config = { ...DEFAULT_CONFIG };

    // Parse command line arguments
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i];
        const value = args[i + 1];

        switch (key) {
            case '--output':
            case '-o':
                config.outputDir = value;
                break;
            case '--count':
            case '-c':
                config.noteCount = parseInt(value, 10);
                break;
            case '--links':
            case '-l':
                config.avgLinksPerNote = parseInt(value, 10);
                break;
            case '--help':
            case '-h':
                console.log(`
Performance Workspace Generator

Usage:
  ts-node scripts/generate-perf-workspace.ts [options]

Options:
  -o, --output <dir>    Output directory (default: perf-workspace)
  -c, --count <n>       Number of notes to generate (default: 1000)
  -l, --links <n>       Average links per note (default: 5)
  -h, --help            Show this help

Examples:
  ts-node scripts/generate-perf-workspace.ts
  ts-node scripts/generate-perf-workspace.ts -c 2000 -l 10
  ts-node scripts/generate-perf-workspace.ts -o my-test-workspace -c 500
                `);
                process.exit(0);
        }
    }

    createWorkspace(config);
}

main();
