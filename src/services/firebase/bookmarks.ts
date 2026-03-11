import {
    collection,
    doc,
    addDoc,
    deleteDoc,
    getDocs,
    updateDoc,
    query,
    orderBy,
    where,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore'
import { db } from './config'
import type { Entry } from '@/types/entry'

// ── TYPES ─────────────────────────────────────────────────────
export interface Bookmark {
    id: string
    entryId: string
    note: string
    createdAt: Date
    // Hydrated entry — joined client-side
    entry?: Entry | null
}

// ── HELPERS ───────────────────────────────────────────────────
const toBookmark = (id: string, data: any): Bookmark => ({
    id,
    entryId: data.entryId ?? '',
    note: data.note ?? '',
    createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toDate() : new Date(),
})

const bookmarksRef = (uid: string) =>
    collection(db, 'users', uid, 'bookmarks')

// ── ADD BOOKMARK ─────────────────────────────────────────────
export const addBookmark = async (
    uid: string,
    entryId: string,
    note: string = ''
): Promise<string> => {
    // Prevent duplicate bookmarks for the same entry
    const existing = await getDocs(
        query(bookmarksRef(uid), where('entryId', '==', entryId))
    )
    if (!existing.empty) {
        return existing.docs[0].id
    }
    const ref = await addDoc(bookmarksRef(uid), {
        entryId,
        note,
        createdAt: serverTimestamp(),
    })
    return ref.id
}

// ── UPDATE BOOKMARK NOTE ──────────────────────────────────────
export const updateBookmarkNote = async (
    uid: string,
    bookmarkId: string,
    note: string
): Promise<void> => {
    const ref = doc(db, 'users', uid, 'bookmarks', bookmarkId)
    await updateDoc(ref, { note })
}

// ── REMOVE BOOKMARK ───────────────────────────────────────────
export const removeBookmark = async (
    uid: string,
    bookmarkId: string
): Promise<void> => {
    const ref = doc(db, 'users', uid, 'bookmarks', bookmarkId)
    await deleteDoc(ref)
}

// ── REMOVE BY ENTRY ID ────────────────────────────────────────
export const removeBookmarkByEntryId = async (
    uid: string,
    entryId: string
): Promise<void> => {
    const q = query(bookmarksRef(uid), where('entryId', '==', entryId))
    const snap = await getDocs(q)
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
}

// ── GET ALL BOOKMARKS ─────────────────────────────────────────
export const getBookmarks = async (uid: string): Promise<Bookmark[]> => {
    const q = query(bookmarksRef(uid), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => toBookmark(d.id, d.data()))
}

// ── CHECK IF ENTRY IS BOOKMARKED ──────────────────────────────
export const isBookmarked = async (
    uid: string,
    entryId: string
): Promise<string | null> => {
    const q = query(bookmarksRef(uid), where('entryId', '==', entryId))
    const snap = await getDocs(q)
    return snap.empty ? null : snap.docs[0].id
}