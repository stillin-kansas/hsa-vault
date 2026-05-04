import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from 'firebase/storage';
import { db, storage } from '../firebase/config';

export function useExpenses(userId) {
  const [expenses, setExpenses] = useState([]);
  const [loading,  setLoading]  = useState(true);

  // Real-time listener — expenses update instantly across all devices
  useEffect(() => {
    if (!userId) { setExpenses([]); setLoading(false); return; }
    const q = query(
      collection(db, 'users', userId, 'expenses'),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  // Upload receipt file to Firebase Storage, return download URL
  const uploadReceipt = async (userId, file) => {
    if (!file) return { fileName: '', fileUrl: '', storagePath: '' };
    const path = `receipts/${userId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    await new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file);
      task.on('state_changed', null, reject, resolve);
    });
    // Get a long-lived download URL (public read via Firebase rules)
    const fileUrl = await getDownloadURL(ref(storage, path));
    return { fileName: file.name, fileUrl, storagePath: path };
  };

  // Add new expense
  const addExpense = async (userId, data, file) => {
    const receiptData = file ? await uploadReceipt(userId, file) : {};
    await addDoc(collection(db, 'users', userId, 'expenses'), {
      ...data,
      ...receiptData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  // Update existing expense
  const updateExpense = async (userId, expenseId, data, file) => {
    const receiptData = file ? await uploadReceipt(userId, file) : {};
    await updateDoc(doc(db, 'users', userId, 'expenses', expenseId), {
      ...data,
      ...receiptData,
      updatedAt: serverTimestamp(),
    });
  };

  // Toggle reimbursed
  const toggleReimbursed = async (userId, expenseId, current) => {
    await updateDoc(doc(db, 'users', userId, 'expenses', expenseId), {
      reimbursed: !current,
      updatedAt: serverTimestamp(),
    });
  };

  // Delete expense (and its receipt from Storage if exists)
  const deleteExpense = async (userId, expense) => {
    if (expense.storagePath) {
      try { await deleteObject(ref(storage, expense.storagePath)); } catch {}
    }
    await deleteDoc(doc(db, 'users', userId, 'expenses', expense.id));
  };

  return { expenses, loading, addExpense, updateExpense, toggleReimbursed, deleteExpense };
}
