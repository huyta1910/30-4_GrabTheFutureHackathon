"""Ride pooling + route optimization (AI core).

Held-Karp TSP for drop-off ordering, exact set-partition DP for passenger
pooling, and Hungarian matching for driver assignment. `backend_adapter`
bridges ORM Booking rows to the pure-Python optimizer.
"""
