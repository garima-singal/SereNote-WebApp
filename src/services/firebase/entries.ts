import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    orderBy,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore'
import { db } from './config'
import type { Entry } from '@/types/entry'

// ── HELPERS ───────────────────────────────────────────────────────────────────

const entriesRef = (uid: string) =>
    collection(db, 'users', uid, 'entries')

// Maps raw Firestore data → typed Entry
// NOTE: We intentionally do NOT filter isDeleted here —
// filtering is done in JS to avoid the composite-index requirement
// (Firestore needs an index for where() + orderBy() on different fields)
const toEntry = (id: string, data: any): Entry => ({
    id,
    title: data.title ?? '',
    body: data.body ?? '',
    bodyText: data.bodyText ?? '',
    // Support both old single-mood and new multi-mood format
    moods: data.moods ?? (data.mood ? [data.mood] : []),
    moodScore: data.moodScore ?? null,
    tags: data.tags ?? [],
    type: data.type ?? 'entry',
    wordCount: data.wordCount ?? 0,
    location: data.location ?? null,
    createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate()
        : new Date(),
    status: data.status ?? 'draft',
    isDeleted: data.isDeleted ?? false,
    deletedAt: data.deletedAt instanceof Timestamp
        ? data.deletedAt.toDate()
        : null,
    aiReflection: data.aiReflection ?? null,
    sentimentScore: data.sentimentScore ?? null,
})

// ── CREATE ────────────────────────────────────────────────────────────────────

export const createEntry = async (uid: string): Promise<string> => {
    const ref = await addDoc(entriesRef(uid), {
        title: '',
        body: '',
        bodyText: '',
        moods: [],
        moodScore: null,
        tags: [],
        type: 'entry',
        wordCount: 0,
        location: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'draft',
        isDeleted: false,
        deletedAt: null,
        aiReflection: null,
        sentimentScore: null,
    })
    return ref.id
}

// ── UPDATE ────────────────────────────────────────────────────────────────────

export const updateEntry = async (
    uid: string,
    entryId: string,
    data: Partial<Entry>
): Promise<void> => {
    const ref = doc(db, 'users', uid, 'entries', entryId)

    // Strip out computed/readonly fields that should never be written back
    // createdAt is set once on create and must not be overwritten with a JS Date
    const { id, createdAt, deletedAt, ...rest } = data as any

    await updateDoc(ref, {
        ...rest,
        updatedAt: serverTimestamp(),
    })
}

// ── GET ONE ───────────────────────────────────────────────────────────────────

export const getEntry = async (
    uid: string,
    entryId: string
): Promise<Entry | null> => {
    const ref = doc(db, 'users', uid, 'entries', entryId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return toEntry(snap.id, snap.data())
}

// ── GET ALL ───────────────────────────────────────────────────────────────────
// Uses orderBy('createdAt') only — NO where() clause.
// Filtering isDeleted in JS avoids the Firestore composite index requirement.
// Without the composite index, where('isDeleted','==',false) + orderBy('createdAt')
// silently returns 0 results until you manually create the index in Firebase Console.

export const getEntries = async (uid: string): Promise<Entry[]> => {
    const q = query(entriesRef(uid), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs
        .map(d => toEntry(d.id, d.data()))
        .filter(e => !e.isDeleted)   // filter soft-deleted in JS
}

// ── SOFT DELETE ───────────────────────────────────────────────────────────────

export const deleteEntry = async (
    uid: string,
    entryId: string
): Promise<void> => {
    const ref = doc(db, 'users', uid, 'entries', entryId)
    await updateDoc(ref, {
        isDeleted: true,
        deletedAt: serverTimestamp(),
    })
}