$env:PGPASSWORD = 'JCS823ch!!'
psql -h localhost -U postgres -d nalakreditimachann_db -c "SELECT ""Id"", ""Email"", ""FirstName"", ""LastName"", ""Role"", ""BranchId"" FROM ""AspNetUsers"" WHERE ""Email"" = 'j.jules@gmail.com';"
