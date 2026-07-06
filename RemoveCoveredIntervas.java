import java.util.Arrays;
public class RemoveCoveredIntervas {
    public int removeCovered(int[][] intervals) {
        Arrays.sort(intervals, (a, b) ->
            a[0] == b[0] ? b[1] - a[1] : a[0] - b[0]
        );
        int count = 0;
        int maxEnd = 0;
        for (int[] interval : intervals) {
            if (interval[1] > maxEnd) {
                count++;
                maxEnd = interval[1];
            }
        }
        return count;
    }
      public static void main(String[] args) {
      RemoveCoveredIntervas obj =new RemoveCoveredIntervas();  
        int[][] intervals = {
            {1, 4},
            {3, 6},
            {2, 8}
        };

        int ans = obj.removeCovered(intervals);

        System.out.println("Remaining Intervals = " + ans);
    }
}
    

