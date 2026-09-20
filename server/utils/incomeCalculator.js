import { pool } from '../config/db.js';

// This is the SINGLE SOURCE OF TRUTH for income calculation
export const getCurrentMonthTotalIncome = async (userId) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM incomes 
     WHERE user_id=$1 
     AND EXTRACT(MONTH FROM date)=$2 
     AND EXTRACT(YEAR FROM date)=$3`,
    [userId, currentMonth, currentYear]
  );
  
  return parseFloat(rows[0].total);
};