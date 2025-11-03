using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalaCreditAPI.Migrations
{
    /// <inheritdoc />
    public partial class FixBranchManagerRelationship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Branches_AspNetUsers_ManagerId1",
                table: "Branches");

            migrationBuilder.DropIndex(
                name: "IX_Branches_ManagerId1",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "ManagerId1",
                table: "Branches");

            migrationBuilder.CreateIndex(
                name: "IX_Branches_ManagerId",
                table: "Branches",
                column: "ManagerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Branches_AspNetUsers_ManagerId",
                table: "Branches",
                column: "ManagerId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Branches_AspNetUsers_ManagerId",
                table: "Branches");

            migrationBuilder.DropIndex(
                name: "IX_Branches_ManagerId",
                table: "Branches");

            migrationBuilder.AddColumn<string>(
                name: "ManagerId1",
                table: "Branches",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Branches_ManagerId1",
                table: "Branches",
                column: "ManagerId1");

            migrationBuilder.AddForeignKey(
                name: "FK_Branches_AspNetUsers_ManagerId1",
                table: "Branches",
                column: "ManagerId1",
                principalTable: "AspNetUsers",
                principalColumn: "Id");
        }
    }
}
