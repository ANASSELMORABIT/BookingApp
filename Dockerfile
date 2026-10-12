# Fase 1 — Build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

COPY BookingApp.slnx .
COPY src/BookingApp.Domain/BookingApp.Domain.csproj src/BookingApp.Domain/
COPY src/BookingApp.Application/BookingApp.Application.csproj src/BookingApp.Application/
COPY src/BookingApp.Infrastructure/BookingApp.Infrastructure.csproj src/BookingApp.Infrastructure/
COPY src/BookingApp.API/BookingApp.API.csproj src/BookingApp.API/
COPY tests/BookingApp.Tests/BookingApp.Tests.csproj tests/BookingApp.Tests/

RUN dotnet restore

COPY . .
RUN dotnet publish src/BookingApp.API/BookingApp.API.csproj -c Release -o /out

# Fase 2 — Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /out .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "BookingApp.API.dll"]